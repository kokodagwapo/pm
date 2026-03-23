/**
 * Luna Autonomous Operations Agent Service
 *
 * Evaluates property management triggers and takes autonomous actions
 * based on configurable autonomy settings and confidence thresholds.
 *
 * Key behaviors:
 * - Per-entity cooldown prevents duplicate notifications within 24h
 * - Spending limit gates vendor-dispatch actions (>spendingLimit → human review)
 * - Full execution error propagation: failures stored as "failed" with reason
 * - AI footer injected on all tenant-facing messages
 * - Localized messages across 9 supported languages
 * - Vendor selection from approved vendor pool by maintenance category
 * - Work-order dispatch with ETA notification to tenant
 * - Lease renewal conversation state machine with manager routing on decline/negotiate
 */

import connectDB from "@/lib/mongodb";
import LunaAutonomousAction, {
  LunaActionCategory,
  LunaActionStatus,
  LunaAutonomyMode,
} from "@/models/LunaAutonomousAction";
import {
  notificationService,
  NotificationType,
  NotificationPriority,
} from "@/lib/notification-service";
import Vendor from "@/models/Vendor";

export interface LunaEscalationContact {
  name: string;
  email: string;
  phone?: string;
  role: string;
}

export interface LunaRoleAutonomyConfig {
  role: "admin" | "manager";
  enabledCategories: LunaActionCategory[];
  canApproveActions: boolean;
  canOverrideActions: boolean;
  receivesDigest: boolean;
}

export interface LunaAutonomySettings {
  mode: LunaAutonomyMode;
  confidenceThreshold: number;
  enabledCategories: LunaActionCategory[];
  digestEmailEnabled: boolean;
  digestEmailFrequency: "daily" | "weekly";
  maxActionsPerHour: number;
  humanReviewThreshold: number;
  spendingLimit: number;
  escalationContacts: LunaEscalationContact[];
  roleAutonomyConfig: LunaRoleAutonomyConfig[];
}

export const DEFAULT_LUNA_SETTINGS: LunaAutonomySettings = {
  mode: "supervised",
  confidenceThreshold: 0.75,
  enabledCategories: [
    "payment_reminder",
    "maintenance_triage",
    "lease_renewal_notice",
    "lease_expiry_alert",
    "tenant_communication",
    "system_digest",
  ],
  digestEmailEnabled: true,
  digestEmailFrequency: "daily",
  maxActionsPerHour: 20,
  humanReviewThreshold: 0.6,
  spendingLimit: 500,
  escalationContacts: [],
  roleAutonomyConfig: [
    {
      role: "admin",
      enabledCategories: [
        "payment_reminder",
        "payment_escalation",
        "maintenance_triage",
        "maintenance_escalation",
        "lease_renewal_notice",
        "lease_expiry_alert",
        "tenant_communication",
        "system_digest",
      ],
      canApproveActions: true,
      canOverrideActions: true,
      receivesDigest: true,
    },
    {
      role: "manager",
      enabledCategories: [
        "payment_reminder",
        "maintenance_triage",
        "lease_renewal_notice",
        "lease_expiry_alert",
        "tenant_communication",
        "system_digest",
      ],
      canApproveActions: true,
      canOverrideActions: false,
      receivesDigest: true,
    },
  ],
};

interface TriggerContext {
  entityType: "payment" | "lease" | "maintenance" | "tenant" | "property" | "system";
  entityId?: string;
  affectedUserId?: string;
  affectedPropertyId?: string;
  data: Record<string, unknown>;
}

interface LunaDecision {
  shouldAct: boolean;
  category: LunaActionCategory;
  title: string;
  description: string;
  reasoning: string;
  confidence: number;
  actionsTaken: string[];
  notificationsSent: string[];
  humanReviewRequired: boolean;
  status: LunaActionStatus;
  executionError?: string;
}

export interface ILunaDecisionRecord {
  _id: string;
  category: LunaActionCategory;
  status: LunaActionStatus;
  title: string;
  description: string;
  reasoning: string;
  confidence: number;
  humanReviewRequired: boolean;
  executedAt?: Date;
  createdAt: Date;
}

const AI_FOOTER_TRANSLATIONS: Record<string, string> = {
  "en": "\n\n—\nSent by SmartStart AI. To speak with a person, reply to this message or contact your property manager directly.",
  "en-US": "\n\n—\nSent by SmartStart AI. To speak with a person, reply to this message or contact your property manager directly.",
  "de": "\n\n—\nGesendet von SmartStart AI. Um mit einer Person zu sprechen, antworten Sie auf diese Nachricht oder kontaktieren Sie direkt Ihren Hausverwalter.",
  "es": "\n\n—\nEnviado por SmartStart AI. Para hablar con una persona, responda a este mensaje o contacte directamente a su administrador de propiedades.",
  "fr": "\n\n—\nEnvoyé par SmartStart AI. Pour parler à une personne, répondez à ce message ou contactez directement votre gestionnaire de propriété.",
  "it": "\n\n—\nInviato da SmartStart AI. Per parlare con una persona, rispondi a questo messaggio o contatta direttamente il tuo amministratore di proprietà.",
  "ja": "\n\n—\nSmartStart AIが送信しました。担当者とお話しするには、このメッセージに返信するか、プロパティマネージャーに直接ご連絡ください。",
  "ru": "\n\n—\nОтправлено SmartStart AI. Чтобы поговорить с человеком, ответьте на это сообщение или свяжитесь с вашим управляющим недвижимостью напрямую.",
  "zh": "\n\n—\n由 SmartStart AI 发送。如需与真人沟通，请回复此消息或直接联系您的物业经理。",
  "fil": "\n\n—\nIpinadala ng SmartStart AI. Upang makipag-usap sa isang tao, tumugon sa mensaheng ito o direktang makipag-ugnayan sa iyong property manager.",
};

const PAYMENT_REMINDER_TEMPLATES: Record<string, (name: string, amount: string, property: string, days: number) => string> = {
  "en": (n, a, p, d) => `Dear ${n}, you have an overdue payment of ${a} for ${p}. This payment is ${d} day(s) overdue. Please arrange payment as soon as possible to avoid further action.`,
  "en-US": (n, a, p, d) => `Dear ${n}, you have an overdue payment of ${a} for ${p}. This payment is ${d} day(s) overdue. Please arrange payment as soon as possible to avoid further action.`,
  "de": (n, a, p, d) => `Liebe/r ${n}, Sie haben eine überfällige Zahlung von ${a} für ${p}. Diese Zahlung ist ${d} Tag(e) überfällig. Bitte veranlassen Sie die Zahlung so bald wie möglich, um weitere Maßnahmen zu vermeiden.`,
  "es": (n, a, p, d) => `Estimado/a ${n}, tiene un pago vencido de ${a} por ${p}. Este pago lleva ${d} día(s) de retraso. Por favor, realice el pago lo antes posible para evitar acciones adicionales.`,
  "fr": (n, a, p, d) => `Cher/Chère ${n}, vous avez un paiement en retard de ${a} pour ${p}. Ce paiement est en retard de ${d} jour(s). Veuillez effectuer le paiement dès que possible pour éviter toute action supplémentaire.`,
  "it": (n, a, p, d) => `Gentile ${n}, ha un pagamento scaduto di ${a} per ${p}. Questo pagamento è in ritardo di ${d} giorno/i. La preghiamo di effettuare il pagamento il prima possibile per evitare ulteriori azioni.`,
  "ja": (n, a, p, d) => `${n} 様、${p} のお支払い ${a} が${d}日滞納しています。追加措置を避けるため、できるだけ早くお支払いください。`,
  "ru": (n, a, p, d) => `Уважаемый/ая ${n}, у вас есть просроченный платёж ${a} за ${p}. Этот платёж просрочен на ${d} день/дней. Пожалуйста, произведите оплату как можно скорее, чтобы избежать дополнительных мер.`,
  "zh": (n, a, p, d) => `亲爱的 ${n}，您有一笔逾期付款 ${a}，用于 ${p}。该付款已逾期 ${d} 天。请尽快安排付款以避免进一步处理。`,
  "fil": (n, a, p, d) => `Mahal na ${n}, mayroon kang overdue na bayad na ${a} para sa ${p}. Ang bayad na ito ay ${d} araw nang huli. Mangyaring ayusin ang bayad sa lalong madaling panahon upang maiwasan ang karagdagang aksyon.`,
};

const MAINTENANCE_ETA_TEMPLATES: Record<string, (name: string, category: string, vendor: string, hours: number) => string> = {
  "en": (n, c, v, h) => `Dear ${n}, your ${c} maintenance request has been reviewed and assigned to ${v}. A technician is expected to contact you within ${h} hours to schedule the repair.`,
  "en-US": (n, c, v, h) => `Dear ${n}, your ${c} maintenance request has been reviewed and assigned to ${v}. A technician is expected to contact you within ${h} hours to schedule the repair.`,
  "de": (n, c, v, h) => `Liebe/r ${n}, Ihre ${c}-Wartungsanfrage wurde geprüft und ${v} zugewiesen. Ein Techniker wird Sie voraussichtlich innerhalb von ${h} Stunden kontaktieren, um die Reparatur zu planen.`,
  "es": (n, c, v, h) => `Estimado/a ${n}, su solicitud de mantenimiento de ${c} ha sido revisada y asignada a ${v}. Se espera que un técnico lo contacte dentro de ${h} horas para programar la reparación.`,
  "fr": (n, c, v, h) => `Cher/Chère ${n}, votre demande de maintenance ${c} a été examinée et assignée à ${v}. Un technicien devrait vous contacter dans ${h} heures pour planifier la réparation.`,
  "it": (n, c, v, h) => `Gentile ${n}, la sua richiesta di manutenzione ${c} è stata esaminata e assegnata a ${v}. Un tecnico dovrebbe contattarla entro ${h} ore per programmare l'intervento.`,
  "ja": (n, c, v, h) => `${n} 様、${c} のメンテナンスリクエストを確認し、${v} に割り当てました。技術者が${h}時間以内に修理の日程調整のためご連絡します。`,
  "ru": (n, c, v, h) => `Уважаемый/ая ${n}, ваша заявка на техническое обслуживание ${c} рассмотрена и назначена ${v}. Ожидается, что специалист свяжется с вами в течение ${h} часов для планирования ремонта.`,
  "zh": (n, c, v, h) => `亲爱的 ${n}，您的 ${c} 维修请求已审核并分配给 ${v}。技术人员预计将在 ${h} 小时内联系您安排维修。`,
  "fil": (n, c, v, h) => `Mahal na ${n}, ang iyong kahilingan sa pagpapanatili ng ${c} ay nasuri na at itinalaga sa ${v}. Inaasahang makikipag-ugnayan sa iyo ang isang technician sa loob ng ${h} oras upang iskedyul ang pagkukumpuni.`,
};

const LEASE_RENEWAL_TEMPLATES: Record<string, (name: string, property: string, days: number, amount?: string) => string> = {
  "en": (n, p, d, a) => `Dear ${n}, your lease for ${p} expires in ${d} days. ${a ? `We are pleased to offer a renewal at $${a}/month. ` : ""}Please log in to your tenant portal to review and accept your renewal offer, or reply to discuss your options.`,
  "en-US": (n, p, d, a) => `Dear ${n}, your lease for ${p} expires in ${d} days. ${a ? `We are pleased to offer a renewal at $${a}/month. ` : ""}Please log in to your tenant portal to review and accept your renewal offer, or reply to discuss your options.`,
  "de": (n, p, d, a) => `Liebe/r ${n}, Ihr Mietvertrag für ${p} läuft in ${d} Tagen ab. ${a ? `Wir freuen uns, eine Verlängerung zu ${a} $/Monat anzubieten. ` : ""}Bitte melden Sie sich in Ihrem Mieterportal an, um Ihr Verlängerungsangebot zu prüfen und anzunehmen, oder antworten Sie, um Ihre Optionen zu besprechen.`,
  "es": (n, p, d, a) => `Estimado/a ${n}, su contrato de arrendamiento para ${p} vence en ${d} días. ${a ? `Nos complace ofrecerle una renovación a $${a}/mes. ` : ""}Por favor, inicie sesión en su portal de inquilino para revisar y aceptar su oferta de renovación, o responda para discutir sus opciones.`,
  "fr": (n, p, d, a) => `Cher/Chère ${n}, votre bail pour ${p} expire dans ${d} jours. ${a ? `Nous avons le plaisir de vous proposer un renouvellement à ${a} $/mois. ` : ""}Veuillez vous connecter à votre portail locataire pour examiner et accepter votre offre de renouvellement, ou répondez pour discuter de vos options.`,
  "it": (n, p, d, a) => `Gentile ${n}, il suo contratto di locazione per ${p} scade tra ${d} giorni. ${a ? `Siamo lieti di offrirle un rinnovo a $${a}/mese. ` : ""}Acceda al suo portale inquilino per esaminare e accettare l'offerta di rinnovo, oppure risponda per discutere le sue opzioni.`,
  "ja": (n, p, d, a) => `${n} 様、${p} の賃貸契約は${d}日後に満了します。${a ? `月額 $${a} での更新をご提案いたします。` : ""}テナントポータルにログインして更新オファーをご確認・承認いただくか、返信でご相談ください。`,
  "ru": (n, p, d, a) => `Уважаемый/ая ${n}, ваш договор аренды на ${p} истекает через ${d} дней. ${a ? `Мы рады предложить продление по $${a}/месяц. ` : ""}Пожалуйста, войдите в свой личный кабинет арендатора, чтобы ознакомиться и принять предложение о продлении, или ответьте, чтобы обсудить варианты.`,
  "zh": (n, p, d, a) => `亲爱的 ${n}，您在 ${p} 的租约将在 ${d} 天后到期。${a ? `我们很高兴以每月 $${a} 为您提供续约方案。` : ""}请登录您的租户门户查看并接受续约方案，或回复讨论您的选项。`,
  "fil": (n, p, d, a) => `Mahal na ${n}, ang iyong lease para sa ${p} ay mag-eexpire sa loob ng ${d} araw. ${a ? `Ikinagagalak naming mag-alok ng pagpapanibago sa $${a}/buwan. ` : ""}Mangyaring mag-log in sa iyong tenant portal upang suriin at tanggapin ang iyong renewal offer, o tumugon upang talakayin ang iyong mga opsyon.`,
};

const LEASE_ACCEPTED_TEMPLATES: Record<string, (name: string, property: string) => string> = {
  "en": (n, p) => `Dear ${n}, thank you for accepting your lease renewal for ${p}. Your renewed lease has been noted and our team will process the paperwork shortly.`,
  "en-US": (n, p) => `Dear ${n}, thank you for accepting your lease renewal for ${p}. Your renewed lease has been noted and our team will process the paperwork shortly.`,
  "de": (n, p) => `Liebe/r ${n}, vielen Dank für die Annahme Ihrer Mietvertragsverlängerung für ${p}. Ihre Verlängerung wurde vermerkt und unser Team wird die Unterlagen in Kürze bearbeiten.`,
  "es": (n, p) => `Estimado/a ${n}, gracias por aceptar la renovación de su contrato de arrendamiento para ${p}. Su renovación ha sido registrada y nuestro equipo procesará la documentación en breve.`,
  "fr": (n, p) => `Cher/Chère ${n}, merci d'avoir accepté le renouvellement de votre bail pour ${p}. Votre renouvellement a été enregistré et notre équipe traitera les documents sous peu.`,
  "it": (n, p) => `Gentile ${n}, grazie per aver accettato il rinnovo del contratto di locazione per ${p}. Il rinnovo è stato registrato e il nostro team elaborerà i documenti a breve.`,
  "ja": (n, p) => `${n} 様、${p} の賃貸契約更新をご承認いただきありがとうございます。更新内容を記録しました。担当者がまもなく手続きを進めます。`,
  "ru": (n, p) => `Уважаемый/ая ${n}, спасибо за принятие продления договора аренды на ${p}. Ваше продление зафиксировано, и наша команда обработает документы в ближайшее время.`,
  "zh": (n, p) => `亲爱的 ${n}，感谢您接受 ${p} 的租约续签。您的续约已记录，我们的团队将很快处理相关文件。`,
  "fil": (n, p) => `Mahal na ${n}, salamat sa pagtanggap ng iyong lease renewal para sa ${p}. Naitala na ang iyong renewal at ang aming koponan ay magpoproseso ng mga papeles sa lalong madaling panahon.`,
};

const LEASE_NEGOTIATING_TEMPLATES: Record<string, (name: string, property: string) => string> = {
  "en": (n, p) => `Dear ${n}, thank you for your response regarding your lease renewal for ${p}. We have received your request to negotiate and have forwarded it to your property manager, who will be in touch shortly.`,
  "en-US": (n, p) => `Dear ${n}, thank you for your response regarding your lease renewal for ${p}. We have received your request to negotiate and have forwarded it to your property manager, who will be in touch shortly.`,
  "de": (n, p) => `Liebe/r ${n}, vielen Dank für Ihre Antwort zur Mietvertragsverlängerung für ${p}. Wir haben Ihren Verhandlungswunsch erhalten und an Ihren Verwalter weitergeleitet, der sich in Kürze bei Ihnen melden wird.`,
  "es": (n, p) => `Estimado/a ${n}, gracias por su respuesta sobre la renovación de su contrato para ${p}. Hemos recibido su solicitud de negociación y la hemos enviado a su administrador, quien se pondrá en contacto en breve.`,
  "fr": (n, p) => `Cher/Chère ${n}, merci pour votre réponse concernant le renouvellement de votre bail pour ${p}. Nous avons bien reçu votre demande de négociation et l'avons transmise à votre gestionnaire, qui vous contactera prochainement.`,
  "it": (n, p) => `Gentile ${n}, grazie per la sua risposta riguardo al rinnovo del contratto per ${p}. Abbiamo ricevuto la sua richiesta di negoziazione e l'abbiamo inoltrata al suo amministratore, che la contatterà a breve.`,
  "ja": (n, p) => `${n} 様、${p} の賃貸契約更新についてのご返信ありがとうございます。交渉のご希望を承りました。担当の物件マネージャーにお伝えし、まもなくご連絡いたします。`,
  "ru": (n, p) => `Уважаемый/ая ${n}, спасибо за ответ по продлению договора аренды на ${p}. Мы получили вашу просьбу о переговорах и передали её вашему управляющему, который свяжется с вами в ближайшее время.`,
  "zh": (n, p) => `亲爱的 ${n}，感谢您就 ${p} 的租约续签作出回复。我们已收到您的协商请求，并已转交给您的物业经理，他们将很快与您联系。`,
  "fil": (n, p) => `Mahal na ${n}, salamat sa iyong tugon tungkol sa lease renewal para sa ${p}. Natanggap namin ang iyong kahilingang makipag-negotiate at ipinasa na ito sa iyong property manager, na makikipag-ugnayan sa iyo sa lalong madaling panahon.`,
};

const LEASE_DECLINED_TEMPLATES: Record<string, (name: string, property: string) => string> = {
  "en": (n, p) => `Dear ${n}, thank you for letting us know regarding your lease for ${p}. We have noted your decision and your property manager will be in touch to discuss the end-of-tenancy process.`,
  "en-US": (n, p) => `Dear ${n}, thank you for letting us know regarding your lease for ${p}. We have noted your decision and your property manager will be in touch to discuss the end-of-tenancy process.`,
  "de": (n, p) => `Liebe/r ${n}, vielen Dank, dass Sie uns bezüglich Ihres Mietvertrags für ${p} informiert haben. Wir haben Ihre Entscheidung vermerkt und Ihr Verwalter wird sich bezüglich des Auszugsverfahrens melden.`,
  "es": (n, p) => `Estimado/a ${n}, gracias por informarnos sobre su contrato para ${p}. Hemos registrado su decisión y su administrador se pondrá en contacto para hablar sobre el proceso de fin de arrendamiento.`,
  "fr": (n, p) => `Cher/Chère ${n}, merci de nous avoir informés concernant votre bail pour ${p}. Nous avons pris note de votre décision et votre gestionnaire vous contactera pour discuter du processus de fin de location.`,
  "it": (n, p) => `Gentile ${n}, grazie per averci comunicato la sua decisione riguardo al contratto per ${p}. Abbiamo preso nota e il suo amministratore la contatterà per discutere la fine della locazione.`,
  "ja": (n, p) => `${n} 様、${p} の賃貸契約についてお知らせいただきありがとうございます。ご決定を承りました。担当の物件マネージャーが退去手続きについてまもなくご連絡いたします。`,
  "ru": (n, p) => `Уважаемый/ая ${n}, спасибо, что сообщили нам о вашем решении по аренде ${p}. Мы зафиксировали ваше решение, и ваш управляющий свяжется с вами для обсуждения процедуры завершения аренды.`,
  "zh": (n, p) => `亲爱的 ${n}，感谢您告知我们有关 ${p} 租约的决定。我们已记录您的决定，您的物业经理将很快与您联系，讨论退租流程。`,
  "fil": (n, p) => `Mahal na ${n}, salamat sa pagpapaalam sa amin tungkol sa iyong lease para sa ${p}. Naitala na namin ang iyong desisyon at makikipag-ugnayan ang iyong property manager para talakayin ang proseso ng pagtatapos ng tenancy.`,
};

function getLeaseAcceptedMessage(locale: string, name: string, property: string): string {
  const lang = locale.split("-")[0];
  const fn = LEASE_ACCEPTED_TEMPLATES[locale] || LEASE_ACCEPTED_TEMPLATES[lang] || LEASE_ACCEPTED_TEMPLATES["en"];
  return fn(name, property) + getAIFooter(locale);
}

function getLeaseNegotiatingMessage(locale: string, name: string, property: string): string {
  const lang = locale.split("-")[0];
  const fn = LEASE_NEGOTIATING_TEMPLATES[locale] || LEASE_NEGOTIATING_TEMPLATES[lang] || LEASE_NEGOTIATING_TEMPLATES["en"];
  return fn(name, property) + getAIFooter(locale);
}

function getLeaseDeclinedMessage(locale: string, name: string, property: string): string {
  const lang = locale.split("-")[0];
  const fn = LEASE_DECLINED_TEMPLATES[locale] || LEASE_DECLINED_TEMPLATES[lang] || LEASE_DECLINED_TEMPLATES["en"];
  return fn(name, property) + getAIFooter(locale);
}

const ACK_TEMPLATES: Record<string, (name: string) => string> = {
  "en": (n) => `Dear ${n}, thank you for your message. Your property manager has been notified and will respond shortly.`,
  "en-US": (n) => `Dear ${n}, thank you for your message. Your property manager has been notified and will respond shortly.`,
  "de": (n) => `Liebe/r ${n}, vielen Dank für Ihre Nachricht. Ihr Hausverwalter wurde benachrichtigt und wird sich in Kürze melden.`,
  "es": (n) => `Estimado/a ${n}, gracias por su mensaje. Su administrador de propiedades ha sido notificado y responderá en breve.`,
  "fr": (n) => `Cher/Chère ${n}, merci pour votre message. Votre gestionnaire de propriété a été notifié et vous répondra sous peu.`,
  "it": (n) => `Gentile ${n}, grazie per il suo messaggio. Il suo amministratore di proprietà è stato avvisato e risponderà a breve.`,
  "ja": (n) => `${n} 様、メッセージをいただきありがとうございます。プロパティマネージャーに通知しました。まもなく返信いたします。`,
  "ru": (n) => `Уважаемый/ая ${n}, спасибо за ваше сообщение. Ваш управляющий недвижимостью уведомлён и ответит в ближайшее время.`,
  "zh": (n) => `亲爱的 ${n}，感谢您的留言。您的物业经理已收到通知，将很快回复您。`,
  "fil": (n) => `Mahal na ${n}, salamat sa iyong mensahe. Naabisuhan na ang iyong property manager at sasagot sa lalong madaling panahon.`,
};

function getAIFooter(locale: string): string {
  const lang = locale.split("-")[0];
  return AI_FOOTER_TRANSLATIONS[locale] || AI_FOOTER_TRANSLATIONS[lang] || AI_FOOTER_TRANSLATIONS["en"];
}

function getPaymentMessage(locale: string, name: string, amount: string, property: string, days: number): string {
  const lang = locale.split("-")[0];
  const fn = PAYMENT_REMINDER_TEMPLATES[locale] || PAYMENT_REMINDER_TEMPLATES[lang] || PAYMENT_REMINDER_TEMPLATES["en"];
  return fn(name, amount, property, days) + getAIFooter(locale);
}

function getMaintenanceETAMessage(locale: string, name: string, category: string, vendor: string, hours: number): string {
  const lang = locale.split("-")[0];
  const fn = MAINTENANCE_ETA_TEMPLATES[locale] || MAINTENANCE_ETA_TEMPLATES[lang] || MAINTENANCE_ETA_TEMPLATES["en"];
  return fn(name, category, vendor, hours) + getAIFooter(locale);
}

function getLeaseRenewalMessage(locale: string, name: string, property: string, days: number, amount?: string): string {
  const lang = locale.split("-")[0];
  const fn = LEASE_RENEWAL_TEMPLATES[locale] || LEASE_RENEWAL_TEMPLATES[lang] || LEASE_RENEWAL_TEMPLATES["en"];
  return fn(name, property, days, amount) + getAIFooter(locale);
}

function getAckMessage(locale: string, name: string): string {
  const lang = locale.split("-")[0];
  const fn = ACK_TEMPLATES[locale] || ACK_TEMPLATES[lang] || ACK_TEMPLATES["en"];
  return fn(name) + getAIFooter(locale);
}

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export class LunaAutonomousService {
  private settings: LunaAutonomySettings;
  private actionCountThisHour: number = 0;
  private hourWindowStart: Date = new Date();

  constructor(settings: Partial<LunaAutonomySettings> = {}) {
    this.settings = { ...DEFAULT_LUNA_SETTINGS, ...settings };
  }

  updateSettings(settings: Partial<LunaAutonomySettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  getSettings(): LunaAutonomySettings {
    return { ...this.settings };
  }

  /**
   * Generate a localized notification body for an approved action.
   * Used by the human-review approval path to maintain 9-language consistency.
   */
  getLocalizedApprovalNotificationBody(
    category: string,
    meta: Record<string, unknown>,
    vendorName?: string,
    vendorEtaHours?: number
  ): string {
    const locale = (meta.tenantLocale as string) || "en";
    const tenantName = (meta.tenantName as string) || "Tenant";
    const propertyName = (meta.propertyName as string) || "Property";
    const amount = meta.amount ? String(meta.amount) : "0";
    const daysOverdue = Number(meta.daysOverdue ?? 0);
    const daysUntilExpiry = Number(meta.daysUntilExpiry ?? 30);
    const category_ = (meta.category as string) || "General";

    switch (category) {
      case "payment_reminder":
      case "payment_escalation":
        return getPaymentMessage(locale, tenantName, `$${amount}`, propertyName, daysOverdue);
      case "maintenance_triage":
      case "maintenance_escalation":
        if (vendorName && vendorEtaHours) {
          return getMaintenanceETAMessage(locale, tenantName, category_, vendorName, vendorEtaHours);
        }
        return getMaintenanceETAMessage(locale, tenantName, category_, "your maintenance team", 24);
      case "lease_renewal_notice":
      case "lease_expiry_alert":
        return getLeaseRenewalMessage(locale, tenantName, propertyName, daysUntilExpiry);
      case "tenant_communication":
        return getAckMessage(locale, tenantName);
      default:
        return `Dear ${tenantName}, an update is available for your property at ${propertyName}.${getAIFooter(locale)}`;
    }
  }

  private resetHourWindowIfNeeded(): void {
    const now = new Date();
    if (now.getTime() - this.hourWindowStart.getTime() > 3_600_000) {
      this.actionCountThisHour = 0;
      this.hourWindowStart = now;
    }
  }

  private canExecuteMoreActions(): boolean {
    this.resetHourWindowIfNeeded();
    return this.actionCountThisHour < this.settings.maxActionsPerHour;
  }

  private isCategoryEnabled(category: LunaActionCategory): boolean {
    return this.settings.enabledCategories.includes(category);
  }

  /**
   * Check category is enabled for a specific role (per-role autonomy).
   */
  isCategoryEnabledForRole(category: LunaActionCategory, role: "admin" | "manager"): boolean {
    const roleConfig = this.settings.roleAutonomyConfig.find((r) => r.role === role);
    if (!roleConfig) return this.isCategoryEnabled(category);
    return roleConfig.enabledCategories.includes(category);
  }

  /**
   * Check if a role can approve/override actions.
   */
  roleCanApprove(role: "admin" | "manager"): boolean {
    const roleConfig = this.settings.roleAutonomyConfig.find((r) => r.role === role);
    return roleConfig?.canApproveActions ?? true;
  }

  roleCanOverride(role: "admin" | "manager"): boolean {
    const roleConfig = this.settings.roleAutonomyConfig.find((r) => r.role === role);
    return roleConfig?.canOverrideActions ?? false;
  }

  /**
   * Atomic deduplication guard: returns true if an action of this category was
   * already executed (or is pending review) for the same entity within the
   * cooldown window.
   *
   * Uses a sparse unique index on `dedupKey` to make the check-and-claim
   * atomic — concurrent callers that race through the check will get a
   * duplicate-key error on the second upsert, preventing double execution.
   */
  private async isDuplicate(entityId: string, category: LunaActionCategory): Promise<boolean> {
    if (!entityId) return false;
    await connectDB();
    const cutoff = new Date(Date.now() - COOLDOWN_MS);
    const existing = await LunaAutonomousAction.findOne({
      triggerEntityId: entityId,
      category,
      status: { $in: ["executed", "pending_human"] },
      createdAt: { $gte: cutoff },
    }).lean();
    return !!existing;
  }

  /**
   * Atomically claim an action slot via a dedicated lock collection (LunaActionLock).
   * Uses MongoDB's unique index + upsert to prevent concurrent duplicate execution.
   * The lock collection has a TTL index and does NOT write to the actions log.
   * Returns true if the slot was claimed, false if already locked (duplicate).
   */
  private async claimActionSlot(
    entityId: string,
    category: LunaActionCategory,
    permanent = false
  ): Promise<boolean> {
    if (!entityId) return true;
    await connectDB();
    const LunaActionLock = (await import("@/models/LunaActionLock")).default;
    const lockKey = permanent
      ? `${entityId}::${category}::permanent`
      : `${entityId}::${category}::${Math.floor(Date.now() / COOLDOWN_MS)}`;
    try {
      await LunaActionLock.create({ lockKey });
      return true;
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: number }).code === 11000
      ) {
        return false;
      }
      throw err;
    }
  }

  /**
   * Select the best available approved vendor for a maintenance category.
   * Returns the highest-rated vendor with fewest active work orders.
   */
  async selectVendorForCategory(category: string): Promise<{ _id: string; name: string; email: string; responseTimeHours: number } | null> {
    await connectDB();
    const vendor = await Vendor.findOne(
      { isApproved: true, categories: category },
      { name: 1, email: 1, responseTimeHours: 1, rating: 1, activeWorkOrders: 1 }
    )
      .sort({ rating: -1, activeWorkOrders: 1 })
      .lean();

    if (!vendor) return null;
    return {
      _id: String(vendor._id),
      name: vendor.name,
      email: vendor.email,
      responseTimeHours: vendor.responseTimeHours ?? 24,
    };
  }

  /**
   * Dispatch a work order: assign maintenance request to vendor + increment their active count.
   */
  private async dispatchWorkOrder(vendorId: string, requestId: string): Promise<void> {
    await connectDB();
    await Vendor.findByIdAndUpdate(vendorId, { $inc: { activeWorkOrders: 1 } });
    const MaintenanceRequest = (await import("@/models/MaintenanceRequest")).default;
    const { MaintenanceStatus } = await import("@/types");
    await MaintenanceRequest.findByIdAndUpdate(requestId, {
      status: MaintenanceStatus.IN_PROGRESS,
    });
  }

  /**
   * Evaluate an overdue payment and send reminders/escalations.
   */
  async evaluateOverduePayment(
    context: TriggerContext & {
      data: {
        tenantName: string;
        tenantEmail: string;
        propertyName: string;
        amount: number;
        daysOverdue: number;
        paymentId: string;
        tenantLocale?: string;
      };
    }
  ): Promise<ILunaDecisionRecord | null> {
    const { data } = context;
    const { tenantName, tenantEmail, propertyName, amount, daysOverdue } = data;
    const locale = data.tenantLocale || "en";

    const category: LunaActionCategory =
      daysOverdue > 14 ? "payment_escalation" : "payment_reminder";

    if (!this.isCategoryEnabled(category)) return null;

    if (context.entityId && await this.isDuplicate(context.entityId, category)) {
      return null;
    }

    const confidence = daysOverdue > 7 ? 0.92 : daysOverdue > 3 ? 0.85 : 0.78;
    const humanReviewRequired =
      confidence < this.settings.humanReviewThreshold || daysOverdue > 30;

    const amountStr = `$${amount.toFixed(2)}`;
    const tenantMessage = getPaymentMessage(locale, tenantName, amountStr, propertyName, daysOverdue);

    const decision: LunaDecision = {
      shouldAct: confidence >= this.settings.confidenceThreshold,
      category,
      title:
        daysOverdue > 14
          ? `Payment Escalation — ${tenantName}`
          : `Automated Payment Reminder — ${tenantName}`,
      description: `${tenantName} has an overdue payment of ${amountStr} for ${propertyName}. ${daysOverdue} days overdue.`,
      reasoning: `Confidence score ${(confidence * 100).toFixed(0)}% based on ${daysOverdue} days overdue. ${
        daysOverdue > 14
          ? "Escalation triggered as overdue exceeds 14 days."
          : "Standard reminder cadence triggered."
      }`,
      confidence,
      actionsTaken: [],
      notificationsSent: [],
      humanReviewRequired,
      status: "evaluated",
    };

    if (decision.shouldAct && this.settings.mode !== "off" && this.canExecuteMoreActions()) {
      if (context.entityId && !await this.claimActionSlot(context.entityId, category)) {
        return null;
      }
      if (this.settings.mode === "full" || !humanReviewRequired) {
        try {
          await notificationService.sendNotification({
            type:
              daysOverdue > 14
                ? NotificationType.PAYMENT_OVERDUE
                : NotificationType.PAYMENT_REMINDER,
            priority:
              daysOverdue > 14 ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
            userId: context.affectedUserId || "",
            title: decision.title,
            message: tenantMessage,
            data: {
              userEmail: tenantEmail,
              userName: tenantName,
              propertyName,
              rentAmount: amount,
              daysOverdue,
              amount,
              locale,
            },
          });
          decision.actionsTaken.push("payment_notification_sent");
          decision.notificationsSent.push(`email:${tenantEmail}`);
          decision.status = "executed";
          this.actionCountThisHour++;
        } catch (err: unknown) {
          decision.status = "failed";
          decision.executionError = err instanceof Error ? err.message : String(err);
        }
      } else {
        decision.status = "pending_human";
      }
    } else if (!decision.shouldAct) {
      decision.status = "skipped";
    }

    return this.logAction(decision, context, "payment_overdue_trigger");
  }

  /**
   * Evaluate a maintenance request:
   * 1. Triage: find best approved vendor for the category
   * 2. Dispatch work order (assign + update status)
   * 3. Notify tenant with ETA in their language
   * 4. Alert manager if emergency
   * 5. Route to human review if cost exceeds spending limit
   */
  async evaluateMaintenanceRequest(
    context: TriggerContext & {
      data: {
        requestId: string;
        tenantName: string;
        tenantEmail: string;
        propertyName: string;
        category: string;
        priority: string;
        description: string;
        hoursUnassigned: number;
        isEmergency: boolean;
        managerEmail?: string;
        managerName?: string;
        managerId?: string;
        estimatedCost?: number;
        tenantLocale?: string;
      };
    }
  ): Promise<ILunaDecisionRecord | null> {
    const { data } = context;
    const locale = data.tenantLocale || "en";
    const actionCategory: LunaActionCategory = data.isEmergency
      ? "maintenance_escalation"
      : "maintenance_triage";

    if (!this.isCategoryEnabled(actionCategory)) return null;

    if (context.entityId && await this.isDuplicate(context.entityId, actionCategory)) {
      return null;
    }

    const baseConfidence = data.isEmergency ? 0.95 : 0.82;
    const confidence =
      data.hoursUnassigned > 8 && !data.isEmergency
        ? Math.min(baseConfidence + 0.05, 0.98)
        : baseConfidence;

    const estimatedCost = data.estimatedCost || 0;
    const exceedsSpendingLimit = estimatedCost > 0 && estimatedCost > this.settings.spendingLimit;

    const humanReviewRequired =
      exceedsSpendingLimit ||
      (!data.isEmergency && confidence < this.settings.humanReviewThreshold);

    const spendNote = exceedsSpendingLimit
      ? ` Estimated cost $${estimatedCost} exceeds spending limit of $${this.settings.spendingLimit} — requires human approval.`
      : "";

    const vendor = await this.selectVendorForCategory(data.category);
    const vendorNote = vendor
      ? ` Best approved vendor: ${vendor.name} (ETA: ${vendor.responseTimeHours}h).`
      : " No approved vendor found for this category — routing to manager.";

    const humanReviewFinal = humanReviewRequired || (!vendor && !data.isEmergency);

    const decision: LunaDecision = {
      shouldAct: confidence >= this.settings.confidenceThreshold,
      category: actionCategory,
      title: data.isEmergency
        ? `Emergency Maintenance Alert — ${data.propertyName}`
        : `Maintenance Triage — ${data.category} (${data.priority})`,
      description: `${data.tenantName} submitted a ${data.priority} priority ${data.category} request for ${data.propertyName}. ${data.isEmergency ? "EMERGENCY — immediate response required." : `${data.hoursUnassigned}h unassigned.`}${spendNote}${vendorNote}`,
      reasoning: `${data.isEmergency ? "Emergency flag set." : `Priority: ${data.priority}, ${data.hoursUnassigned}h unassigned.`} Confidence ${(confidence * 100).toFixed(0)}%.${exceedsSpendingLimit ? " Spending limit exceeded — routing to human." : ""}${vendor ? ` Dispatching to ${vendor.name}.` : " No vendor available — routing to manager."}`,
      confidence,
      actionsTaken: [],
      notificationsSent: [],
      humanReviewRequired: humanReviewFinal,
      status: "evaluated",
    };

    if (decision.shouldAct && this.settings.mode !== "off" && this.canExecuteMoreActions()) {
      if (context.entityId && !await this.claimActionSlot(context.entityId, actionCategory)) {
        return null;
      }
      if (this.settings.mode === "full" || !humanReviewFinal) {
        try {
          if (vendor && !exceedsSpendingLimit) {
            await this.dispatchWorkOrder(vendor._id, data.requestId);
            decision.actionsTaken.push(`work_order_dispatched:${vendor.name}`);

            const etaMsg = getMaintenanceETAMessage(locale, data.tenantName, data.category, vendor.name, vendor.responseTimeHours);
            await notificationService.sendNotification({
              type: NotificationType.MAINTENANCE_UPDATE,
              priority: data.isEmergency ? NotificationPriority.CRITICAL : NotificationPriority.NORMAL,
              userId: context.affectedUserId || "",
              title: `Maintenance Update — ${data.category} Request`,
              message: etaMsg,
              data: {
                userEmail: data.tenantEmail,
                userName: data.tenantName,
                requestId: data.requestId,
                propertyName: data.propertyName,
                status: "in_progress",
                description: data.description,
                vendorName: vendor.name,
                vendorEtaHours: vendor.responseTimeHours,
                locale,
              },
            });
            decision.actionsTaken.push("tenant_eta_notification_sent");
            decision.notificationsSent.push(`email:${data.tenantEmail}`);
          } else {
            await notificationService.sendNotification({
              type: NotificationType.MAINTENANCE_UPDATE,
              priority: data.isEmergency ? NotificationPriority.CRITICAL : NotificationPriority.NORMAL,
              userId: context.affectedUserId || "",
              title: decision.title,
              message: decision.description + getAIFooter(locale),
              data: {
                userEmail: data.tenantEmail,
                userName: data.tenantName,
                requestId: data.requestId,
                propertyName: data.propertyName,
                status: data.isEmergency ? "emergency_escalated" : "triaged",
                description: data.description,
                locale,
              },
            });
            decision.actionsTaken.push("maintenance_notification_sent");
            decision.notificationsSent.push(`email:${data.tenantEmail}`);
          }

          if (data.isEmergency && data.managerEmail && data.managerId) {
            await notificationService.sendNotification({
              type: NotificationType.MAINTENANCE_EMERGENCY,
              priority: NotificationPriority.CRITICAL,
              userId: data.managerId,
              title: `EMERGENCY: ${data.category} at ${data.propertyName}`,
              message: `Tenant ${data.tenantName} reported an emergency: ${data.description}${vendor ? ` Dispatched to ${vendor.name}.` : " No vendor available — manual assignment required."}`,
              data: {
                userEmail: data.managerEmail,
                userName: data.managerName || "Property Manager",
                requestId: data.requestId,
                propertyName: data.propertyName,
                status: "emergency",
                description: data.description,
                vendorName: vendor?.name,
              },
            });
            decision.actionsTaken.push("manager_emergency_alert_sent");
            decision.notificationsSent.push(`email:${data.managerEmail}`);
          } else if (data.isEmergency && this.settings.escalationContacts.length > 0) {
            const primary = this.settings.escalationContacts[0];
            decision.actionsTaken.push(`escalation_contact_alerted:${primary.email}`);
            decision.notificationsSent.push(`escalation:${primary.email}`);
          }

          decision.status = "executed";
          this.actionCountThisHour++;
        } catch (err: unknown) {
          decision.status = "failed";
          decision.executionError = err instanceof Error ? err.message : String(err);
        }
      } else {
        decision.status = "pending_human";
      }
    } else if (!decision.shouldAct) {
      decision.status = "skipped";
    }

    return this.logAction(decision, context, "maintenance_submitted_trigger");
  }

  /**
   * Evaluate a lease expiry with a full renewal conversation state machine:
   *
   * State machine:
   *   null (initial)     → send renewal offer to tenant, log as executed
   *   "accepted"         → send confirmation, log as executed
   *   "negotiating"      → send acknowledgement to tenant, route to manager for negotiation
   *   "declined"         → send acknowledgement to tenant, route to manager to confirm end of tenancy
   *
   * Only the initial outreach runs autonomously. Negotiation/decline always routes to manager.
   */
  async evaluateLeaseExpiry(
    context: TriggerContext & {
      data: {
        leaseId: string;
        tenantName: string;
        tenantEmail: string;
        propertyName: string;
        expiryDate: Date;
        daysUntilExpiry: number;
        managerEmail?: string;
        managerName?: string;
        managerId?: string;
        tenantResponse?: "accepted" | "negotiating" | "declined" | null;
        renewalOfferAmount?: number;
        tenantLocale?: string;
      };
    }
  ): Promise<ILunaDecisionRecord | null> {
    const { data } = context;
    const { daysUntilExpiry, tenantResponse } = data;
    const locale = data.tenantLocale || "en";

    const actionCategory: LunaActionCategory =
      daysUntilExpiry <= 30 ? "lease_expiry_alert" : "lease_renewal_notice";

    if (!this.isCategoryEnabled(actionCategory)) return null;

    if (context.entityId && await this.isDuplicate(context.entityId, actionCategory)) {
      return null;
    }

    const confidence =
      daysUntilExpiry <= 14 ? 0.95 : daysUntilExpiry <= 30 ? 0.88 : 0.8;

    const routeToManager = tenantResponse === "negotiating" || tenantResponse === "declined";
    const humanReviewRequired = routeToManager || confidence < this.settings.humanReviewThreshold;

    const amountStr = data.renewalOfferAmount ? String(data.renewalOfferAmount) : undefined;

    let renewalMessage: string;
    if (tenantResponse === "accepted") {
      renewalMessage = getLeaseAcceptedMessage(locale, data.tenantName, data.propertyName);
    } else if (tenantResponse === "negotiating") {
      renewalMessage = getLeaseNegotiatingMessage(locale, data.tenantName, data.propertyName);
    } else if (tenantResponse === "declined") {
      renewalMessage = getLeaseDeclinedMessage(locale, data.tenantName, data.propertyName);
    } else {
      renewalMessage = getLeaseRenewalMessage(locale, data.tenantName, data.propertyName, daysUntilExpiry, amountStr);
    }

    const managerSubject = routeToManager
      ? `[Action Required] Lease ${tenantResponse === "declined" ? "Decline" : "Negotiation"} — ${data.tenantName}`
      : daysUntilExpiry <= 30
      ? `[Manager] Lease Expiry Alert — ${data.tenantName}`
      : `[Manager] Lease Renewal Outreach — ${data.tenantName}`;

    const managerMsg = routeToManager
      ? `Tenant ${data.tenantName} responded "${tenantResponse}" to the renewal offer for ${data.propertyName}. ${
          tenantResponse === "declined"
            ? "Please initiate end-of-tenancy procedures and confirm with the tenant."
            : "Please contact the tenant directly to negotiate lease terms."
        }`
      : `Luna has sent a lease renewal outreach to ${data.tenantName} for ${data.propertyName}. Lease expires in ${daysUntilExpiry} days.`;

    const decision: LunaDecision = {
      shouldAct: confidence >= this.settings.confidenceThreshold,
      category: actionCategory,
      title:
        daysUntilExpiry <= 30
          ? `Lease Expiry Alert — ${data.tenantName}`
          : `Lease Renewal Conversation — ${data.tenantName}`,
      description: `Lease for ${data.tenantName} at ${data.propertyName} expires in ${daysUntilExpiry} days (${new Date(data.expiryDate).toLocaleDateString()}).${routeToManager ? ` Tenant response: "${tenantResponse}" — routing to manager.` : ""}`,
      reasoning: `${daysUntilExpiry} days until lease expiry. Confidence ${(confidence * 100).toFixed(0)}%. ${
        routeToManager
          ? `Tenant responded "${tenantResponse}" — manager must handle ${tenantResponse === "declined" ? "end-of-tenancy" : "negotiation"}.`
          : daysUntilExpiry <= 30
          ? "Critical window — lease expiry alert required."
          : "Standard renewal outreach window — initiating renewal conversation."
      }`,
      confidence,
      actionsTaken: [],
      notificationsSent: [],
      humanReviewRequired,
      status: "evaluated",
    };

    if (decision.shouldAct && this.settings.mode !== "off" && this.canExecuteMoreActions()) {
      if (context.entityId && !await this.claimActionSlot(context.entityId, actionCategory, true)) {
        return null;
      }
      if (this.settings.mode === "full" || !humanReviewRequired) {
        try {
          await notificationService.sendNotification({
            type: NotificationType.LEASE_EXPIRY,
            priority:
              daysUntilExpiry <= 14 ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
            userId: context.affectedUserId || "",
            title: decision.title,
            message: renewalMessage,
            data: {
              userEmail: data.tenantEmail,
              userName: data.tenantName,
              propertyName: data.propertyName,
              expiryDate: new Date(data.expiryDate).toISOString(),
              daysUntilExpiry,
              leaseId: data.leaseId,
              renewalOfferAmount: data.renewalOfferAmount,
              tenantResponse,
              isLandlord: false,
              locale,
            },
          });
          decision.actionsTaken.push(
            tenantResponse
              ? `tenant_response_acknowledged:${tenantResponse}`
              : "tenant_renewal_offer_sent"
          );
          decision.notificationsSent.push(`email:${data.tenantEmail}`);

          if (data.managerEmail && data.managerId) {
            await notificationService.sendNotification({
              type: NotificationType.LEASE_EXPIRY,
              priority:
                routeToManager || daysUntilExpiry <= 14
                  ? NotificationPriority.HIGH
                  : NotificationPriority.NORMAL,
              userId: data.managerId,
              title: managerSubject,
              message: managerMsg,
              data: {
                userEmail: data.managerEmail,
                userName: data.managerName || "Property Manager",
                propertyName: data.propertyName,
                tenantName: data.tenantName,
                expiryDate: new Date(data.expiryDate).toISOString(),
                daysUntilExpiry,
                leaseId: data.leaseId,
                tenantResponse,
                isLandlord: true,
                requiresAction: routeToManager,
              },
            });
            decision.actionsTaken.push(
              routeToManager ? "manager_negotiation_routed" : "manager_lease_alert_sent"
            );
            decision.notificationsSent.push(`email:${data.managerEmail}`);
          }

          decision.status = "executed";
          this.actionCountThisHour++;
        } catch (err: unknown) {
          decision.status = "failed";
          decision.executionError = err instanceof Error ? err.message : String(err);
        }
      } else {
        decision.status = "pending_human";
      }
    } else if (!decision.shouldAct) {
      decision.status = "skipped";
    }

    return this.logAction(decision, context, "lease_expiry_trigger");
  }

  /**
   * Evaluate unanswered tenant messages older than 24h.
   * Sends localized acknowledgement to tenant and alerts manager.
   */
  async evaluateUnansweredMessage(
    context: TriggerContext & {
      data: {
        conversationId: string;
        tenantName: string;
        tenantEmail: string;
        propertyName?: string;
        lastMessagePreview: string;
        hoursUnanswered: number;
        managerEmail?: string;
        managerName?: string;
        managerId?: string;
        tenantLocale?: string;
      };
    }
  ): Promise<ILunaDecisionRecord | null> {
    const { data } = context;
    const locale = data.tenantLocale || "en";

    if (!this.isCategoryEnabled("tenant_communication")) return null;

    if (context.entityId && await this.isDuplicate(context.entityId, "tenant_communication")) {
      return null;
    }

    const confidence = data.hoursUnanswered > 48 ? 0.9 : 0.82;
    const humanReviewRequired = confidence < this.settings.humanReviewThreshold;

    const decision: LunaDecision = {
      shouldAct: confidence >= this.settings.confidenceThreshold,
      category: "tenant_communication",
      title: `Unanswered Tenant Message — ${data.tenantName}`,
      description: `Tenant ${data.tenantName} sent a message ${data.hoursUnanswered}h ago with no response: "${data.lastMessagePreview.substring(0, 100)}${data.lastMessagePreview.length > 100 ? "…" : ""}"`,
      reasoning: `Message unanswered for ${data.hoursUnanswered}h. Confidence ${(confidence * 100).toFixed(0)}%. ${
        data.hoursUnanswered > 48
          ? "Message critically overdue — escalation to manager warranted."
          : "Auto-acknowledgement to tenant and alert to manager warranted."
      }`,
      confidence,
      actionsTaken: [],
      notificationsSent: [],
      humanReviewRequired,
      status: "evaluated",
    };

    if (decision.shouldAct && this.settings.mode !== "off" && this.canExecuteMoreActions()) {
      if (context.entityId && !await this.claimActionSlot(context.entityId, "tenant_communication")) {
        return null;
      }
      if (this.settings.mode === "full" || !humanReviewRequired) {
        try {
          const ackMsg = getAckMessage(locale, data.tenantName);
          await notificationService.sendNotification({
            type: NotificationType.SYSTEM_ANNOUNCEMENT,
            priority:
              data.hoursUnanswered > 48
                ? NotificationPriority.HIGH
                : NotificationPriority.NORMAL,
            userId: context.affectedUserId || "",
            title: "Your message has been received",
            message: ackMsg,
            data: {
              userEmail: data.tenantEmail,
              userName: data.tenantName,
              conversationId: data.conversationId,
              propertyName: data.propertyName,
              locale,
            },
          });
          decision.actionsTaken.push("tenant_acknowledgement_sent");
          decision.notificationsSent.push(`email:${data.tenantEmail}`);

          if (data.managerEmail && data.managerId) {
            await notificationService.sendNotification({
              type: NotificationType.SYSTEM_ANNOUNCEMENT,
              priority:
                data.hoursUnanswered > 48
                  ? NotificationPriority.HIGH
                  : NotificationPriority.NORMAL,
              userId: data.managerId,
              title: `[Unanswered ${data.hoursUnanswered}h] Message from ${data.tenantName}`,
              message: `Tenant ${data.tenantName} has an unanswered message from ${data.hoursUnanswered}h ago. Preview: "${data.lastMessagePreview.substring(0, 150)}"`,
              data: {
                userEmail: data.managerEmail,
                userName: data.managerName || "Property Manager",
                conversationId: data.conversationId,
                tenantName: data.tenantName,
                hoursUnanswered: data.hoursUnanswered,
              },
            });
            decision.actionsTaken.push("manager_message_alert_sent");
            decision.notificationsSent.push(`email:${data.managerEmail}`);
          }

          decision.status = "executed";
          this.actionCountThisHour++;
        } catch (err: unknown) {
          decision.status = "failed";
          decision.executionError = err instanceof Error ? err.message : String(err);
        }
      } else {
        decision.status = "pending_human";
      }
    } else if (!decision.shouldAct) {
      decision.status = "skipped";
    }

    return this.logAction(decision, context, "unanswered_message_trigger");
  }

  /**
   * Generate a daily portfolio digest for managers.
   */
  async generateSystemDigest(
    context: TriggerContext & {
      data: {
        propertyCount: number;
        activeLeaseCount: number;
        overduePaymentCount: number;
        overduePaymentTotal: number;
        openMaintenanceCount: number;
        emergencyMaintenanceCount: number;
        expiringLeasesCount: number;
        actionsExecutedToday: number;
        managerEmail?: string;
        managerName?: string;
        managerId?: string;
      };
    }
  ): Promise<ILunaDecisionRecord | null> {
    const { data } = context;
    if (!this.isCategoryEnabled("system_digest")) return null;

    const hasAlerts =
      data.emergencyMaintenanceCount > 0 ||
      data.overduePaymentCount > 3 ||
      data.expiringLeasesCount > 0;

    const confidence = 0.98;
    const decision: LunaDecision = {
      shouldAct: true,
      category: "system_digest",
      title: `Daily Operations Digest — ${new Date().toLocaleDateString()}`,
      description: `Portfolio summary: ${data.propertyCount} properties, ${data.activeLeaseCount} active leases, ${data.overduePaymentCount} overdue payments ($${data.overduePaymentTotal.toFixed(0)}), ${data.openMaintenanceCount} open maintenance requests (${data.emergencyMaintenanceCount} emergency), ${data.expiringLeasesCount} leases expiring within 60 days.`,
      reasoning: `Daily digest generated at ${new Date().toLocaleTimeString()}. ${hasAlerts ? "Alerts present that require attention." : "All metrics within normal ranges."}`,
      confidence,
      actionsTaken: ["digest_generated"],
      notificationsSent: [],
      humanReviewRequired: false,
      status: "executed",
    };

    if (data.managerEmail && this.settings.digestEmailEnabled) {
      try {
        await notificationService.sendNotification({
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          priority: hasAlerts ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
          userId: data.managerId || "",
          title: decision.title,
          message: decision.description,
          data: {
            userEmail: data.managerEmail,
            userName: data.managerName || "Property Manager",
            ...data,
          },
        });
        decision.notificationsSent.push(`email:${data.managerEmail}`);
      } catch {
        // digest email is best-effort; don't fail the whole digest
      }
    }

    return this.logAction(decision, context, "daily_digest_trigger");
  }

  /**
   * Compute action stats from the DB for the dashboard.
   */
  async getActionStats(): Promise<{
    totalToday: number;
    totalWeek: number;
    executedToday: number;
    pendingHuman: number;
    failedTotal: number;
    successRate: number;
  }> {
    await connectDB();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalToday, totalWeek, executedToday, pendingHuman, failedTotal, executedTotal] =
      await Promise.all([
        LunaAutonomousAction.countDocuments({ createdAt: { $gte: startOfToday } }),
        LunaAutonomousAction.countDocuments({ createdAt: { $gte: startOfWeek } }),
        LunaAutonomousAction.countDocuments({
          status: "executed",
          createdAt: { $gte: startOfToday },
        }),
        LunaAutonomousAction.countDocuments({ status: "pending_human" }),
        LunaAutonomousAction.countDocuments({ status: "failed" }),
        LunaAutonomousAction.countDocuments({ status: "executed" }),
      ]);

    const total = executedTotal + failedTotal;
    const successRate = total > 0 ? Math.round((executedTotal / total) * 100) : 100;

    return { totalToday, totalWeek, executedToday, pendingHuman, failedTotal, successRate };
  }

  private async logAction(
    decision: LunaDecision,
    context: TriggerContext,
    triggerEvent: string
  ): Promise<ILunaDecisionRecord | null> {
    try {
      await connectDB();
      const record = await LunaAutonomousAction.create({
        category: decision.category,
        status: decision.status,
        title: decision.title,
        description: decision.description,
        reasoning: decision.reasoning,
        confidence: decision.confidence,
        triggerEvent,
        triggerEntityType: context.entityType,
        triggerEntityId: context.entityId,
        affectedUserId: context.affectedUserId,
        affectedPropertyId: context.affectedPropertyId,
        actionsTaken: decision.actionsTaken,
        notificationsSent: decision.notificationsSent,
        humanReviewRequired: decision.humanReviewRequired,
        executedAt: decision.status === "executed" ? new Date() : undefined,
        executionError: decision.executionError,
        metadata: context.data,
      });

      return {
        _id: String(record._id),
        category: record.category,
        status: record.status,
        title: record.title,
        description: record.description,
        reasoning: record.reasoning,
        confidence: record.confidence,
        humanReviewRequired: record.humanReviewRequired,
        executedAt: record.executedAt,
        createdAt: record.createdAt,
      };
    } catch (err) {
      console.error("[Luna] Failed to log action:", err);
      return null;
    }
  }
}

export const lunaAutonomousService = new LunaAutonomousService();
