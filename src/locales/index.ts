import enCommon from "./en/common.json";
import enAuth from "./en/auth.json";
import enTour from "./en/tour.json";
import enSettings from "./en/settings.json";
import enDashboard from "./en/dashboard.json";
import enProperties from "./en/properties.json";
import enTenants from "./en/tenants.json";
import enLeases from "./en/leases.json";
import enMaintenance from "./en/maintenance.json";
import enPayments from "./en/payments.json";
import enAnalytics from "./en/analytics.json";
import enMessages from "./en/messages.json";
import enCalendar from "./en/calendar.json";
import enAdmin from "./en/admin.json";
import esCommon from "./es/common.json";
import esAuth from "./es/auth.json";
import esTour from "./es/tour.json";
import esSettings from "./es/settings.json";
import esDashboard from "./es/dashboard.json";
import esProperties from "./es/properties.json";
import esTenants from "./es/tenants.json";
import esLeases from "./es/leases.json";
import esMaintenance from "./es/maintenance.json";
import esPayments from "./es/payments.json";
import esAnalytics from "./es/analytics.json";
import esMessages from "./es/messages.json";
import esCalendar from "./es/calendar.json";
import esAdmin from "./es/admin.json";
import frCommon from "./fr/common.json";
import frAuth from "./fr/auth.json";
import frTour from "./fr/tour.json";
import frSettings from "./fr/settings.json";
import frDashboard from "./fr/dashboard.json";
import frProperties from "./fr/properties.json";
import frTenants from "./fr/tenants.json";
import frLeases from "./fr/leases.json";
import frMaintenance from "./fr/maintenance.json";
import frPayments from "./fr/payments.json";
import frAnalytics from "./fr/analytics.json";
import frMessages from "./fr/messages.json";
import frCalendar from "./fr/calendar.json";
import frAdmin from "./fr/admin.json";
import deCommon from "./de/common.json";
import deAuth from "./de/auth.json";
import deTour from "./de/tour.json";
import deSettings from "./de/settings.json";
import deDashboard from "./de/dashboard.json";
import deProperties from "./de/properties.json";
import deTenants from "./de/tenants.json";
import deLeases from "./de/leases.json";
import deMaintenance from "./de/maintenance.json";
import dePayments from "./de/payments.json";
import deAnalytics from "./de/analytics.json";
import deMessages from "./de/messages.json";
import deCalendar from "./de/calendar.json";
import deAdmin from "./de/admin.json";
import itCommon from "./it/common.json";
import itAuth from "./it/auth.json";
import itTour from "./it/tour.json";
import itDashboard from "./it/dashboard.json";
import itSettings from "./it/settings.json";
import itProperties from "./it/properties.json";
import itTenants from "./it/tenants.json";
import itLeases from "./it/leases.json";
import itMaintenance from "./it/maintenance.json";
import itPayments from "./it/payments.json";
import itAnalytics from "./it/analytics.json";
import itMessages from "./it/messages.json";
import itCalendar from "./it/calendar.json";
import itAdmin from "./it/admin.json";
import zhCommon from "./zh/common.json";
import zhAuth from "./zh/auth.json";
import zhTour from "./zh/tour.json";
import zhDashboard from "./zh/dashboard.json";
import zhSettings from "./zh/settings.json";
import zhProperties from "./zh/properties.json";
import zhTenants from "./zh/tenants.json";
import zhLeases from "./zh/leases.json";
import zhMaintenance from "./zh/maintenance.json";
import zhPayments from "./zh/payments.json";
import zhAnalytics from "./zh/analytics.json";
import zhMessages from "./zh/messages.json";
import zhCalendar from "./zh/calendar.json";
import zhAdmin from "./zh/admin.json";
import jaCommon from "./ja/common.json";
import jaAuth from "./ja/auth.json";
import jaTour from "./ja/tour.json";
import jaDashboard from "./ja/dashboard.json";
import jaSettings from "./ja/settings.json";
import jaProperties from "./ja/properties.json";
import jaTenants from "./ja/tenants.json";
import jaLeases from "./ja/leases.json";
import jaMaintenance from "./ja/maintenance.json";
import jaPayments from "./ja/payments.json";
import jaAnalytics from "./ja/analytics.json";
import jaMessages from "./ja/messages.json";
import jaCalendar from "./ja/calendar.json";
import jaAdmin from "./ja/admin.json";
import filCommon from "./fil/common.json";
import filAuth from "./fil/auth.json";
import filTour from "./fil/tour.json";
import filDashboard from "./fil/dashboard.json";
import filSettings from "./fil/settings.json";
import filProperties from "./fil/properties.json";
import filTenants from "./fil/tenants.json";
import filLeases from "./fil/leases.json";
import filMaintenance from "./fil/maintenance.json";
import filPayments from "./fil/payments.json";
import filAnalytics from "./fil/analytics.json";
import filMessages from "./fil/messages.json";
import filCalendar from "./fil/calendar.json";
import filAdmin from "./fil/admin.json";
import ruCommon from "./ru/common.json";
import ruAuth from "./ru/auth.json";
import ruTour from "./ru/tour.json";
import ruDashboard from "./ru/dashboard.json";
import ruSettings from "./ru/settings.json";
import ruProperties from "./ru/properties.json";
import ruTenants from "./ru/tenants.json";
import ruLeases from "./ru/leases.json";
import ruMaintenance from "./ru/maintenance.json";
import ruPayments from "./ru/payments.json";
import ruAnalytics from "./ru/analytics.json";
import ruMessages from "./ru/messages.json";
import ruCalendar from "./ru/calendar.json";
import ruAdmin from "./ru/admin.json";

type LanguageCatalog = Record<string, string>;

const mergeCatalogs = (...sources: LanguageCatalog[]): LanguageCatalog => {
  return Object.assign({}, ...sources);
};

const catalogsByLanguage: Record<string, LanguageCatalog> = {
  en: mergeCatalogs(
    enCommon, enAuth, enTour, enSettings, enDashboard, enProperties, enTenants,
    enLeases, enMaintenance, enPayments, enAnalytics, enMessages, enCalendar, enAdmin
  ),
  es: mergeCatalogs(
    esCommon, esAuth, esTour, esSettings, esDashboard, esProperties, esTenants,
    esLeases, esMaintenance, esPayments, esAnalytics, esMessages, esCalendar, esAdmin
  ),
  fr: mergeCatalogs(
    frCommon, frAuth, frTour, frSettings, frDashboard, frProperties, frTenants,
    frLeases, frMaintenance, frPayments, frAnalytics, frMessages, frCalendar, frAdmin
  ),
  de: mergeCatalogs(
    deCommon, deAuth, deTour, deSettings, deDashboard, deProperties, deTenants,
    deLeases, deMaintenance, dePayments, deAnalytics, deMessages, deCalendar, deAdmin
  ),
  it: mergeCatalogs(
    itCommon, itAuth, itTour, itDashboard, itSettings, itProperties, itTenants,
    itLeases, itMaintenance, itPayments, itAnalytics, itMessages, itCalendar, itAdmin
  ),
  zh: mergeCatalogs(
    zhCommon, zhAuth, zhTour, zhDashboard, zhSettings, zhProperties, zhTenants,
    zhLeases, zhMaintenance, zhPayments, zhAnalytics, zhMessages, zhCalendar, zhAdmin
  ),
  ja: mergeCatalogs(
    jaCommon, jaAuth, jaTour, jaDashboard, jaSettings, jaProperties, jaTenants,
    jaLeases, jaMaintenance, jaPayments, jaAnalytics, jaMessages, jaCalendar, jaAdmin
  ),
  fil: mergeCatalogs(
    filCommon, filAuth, filTour, filDashboard, filSettings, filProperties, filTenants,
    filLeases, filMaintenance, filPayments, filAnalytics, filMessages, filCalendar, filAdmin
  ),
  ru: mergeCatalogs(
    ruCommon, ruAuth, ruTour, ruDashboard, ruSettings, ruProperties, ruTenants,
    ruLeases, ruMaintenance, ruPayments, ruAnalytics, ruMessages, ruCalendar, ruAdmin
  ),
};

export const translations: Record<string, Record<string, string>> = {};

for (const [language, catalog] of Object.entries(catalogsByLanguage)) {
  for (const [key, value] of Object.entries(catalog)) {
    if (!translations[key]) {
      translations[key] = {};
    }
    translations[key][language] = value;
  }
}
