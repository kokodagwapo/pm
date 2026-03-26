"use client";

import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import FullCalendar from "@fullcalendar/react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  MoreVertical,
  Settings,
  Download,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { IEvent, UserRole } from "@/types";
import { EventForm } from "@/components/calendar/EventForm";
import { EventList } from "@/components/calendar/EventList";
import { CalendarStats } from "@/components/calendar/CalendarStats";

const CalendarView = dynamic(
  () => import("@/components/calendar/CalendarView"),
  { ssr: false, loading: () => <div className="min-h-[400px] animate-pulse rounded-xl bg-white/5" /> }
);
import React, { useState, useEffect, useRef, Suspense } from "react";
import { CalendarSettings } from "@/components/calendar/CalendarSettings";
import { CalendarAnalytics } from "@/components/calendar/CalendarAnalytics";
import { EventDetailsDialog } from "@/components/calendar/EventDetailsDialog";
import { GoogleCalendarSync } from "@/components/calendar/GoogleCalendarSync";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { useOptionalDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";
import { cn } from "@/lib/utils";

export default function CalendarPage() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { t } = useLocalizationContext();
  const dash = useOptionalDashboardAppearance();
  const isLight = dash?.isLight ?? false;

  const [selectedEvent, setSelectedEvent] = useState<IEvent | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<IEvent | null>(null);
  const [activeTab, setActiveTab] = useState("calendar");
  const [showGoogleSync, setShowGoogleSync] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [calendarSettings, setCalendarSettings] = useState({
    weekends: true,
    businessHours: {
      startTime: "09:00",
      endTime: "17:00",
    },
    defaultEventDuration: "01:00",
    slotDuration: "00:30",
    snapDuration: "00:15",
    timezone: "local",
    firstDay: 0,
  });
  const calendarRef = useRef<FullCalendar | null>(null);

  // Get user role from session
  const userRole = (session?.user as any)?.role as UserRole | undefined;
  const isTenant = userRole === UserRole.TENANT;
  const canCreateEvents = !isTenant; // Only admin and manager can create events

  // Handle URL parameters for success/error messages
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "google_connected") {
      toast.success(t("calendar.toast.googleConnected"));
    } else if (error === "oauth_failed") {
      toast.error(t("calendar.toast.oauthFailed"));
    } else if (error === "token_exchange_failed") {
      toast.error(t("calendar.toast.tokenExchangeFailed"));
    } else if (error === "callback_failed") {
      toast.error(t("calendar.toast.callbackFailed"));
    }

    // Clean up URL parameters
    if (success || error) {
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, t]);

  const fetchEvents = async (start: Date, end: Date) => {
    // Fetch events for the specified date range
  };

  const handleEventClick = (event: IEvent) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const handleCreateEvent = (dateInfo?: {
    start: Date;
    end: Date;
    allDay: boolean;
  }) => {
    // Prevent tenants from creating events
    if (isTenant) {
      toast.error(t("calendar.toast.noCreatePermission"), {
        description: t("calendar.toast.noCreatePermissionDesc"),
      });
      return;
    }

    if (dateInfo) {
      // Pre-populate form with selected date/time
      setEventToEdit({
        startDate: dateInfo.start,
        endDate: dateInfo.end,
        allDay: dateInfo.allDay,
      } as IEvent);
    } else {
      setEventToEdit(null);
    }
    setShowEventForm(true);
  };

  const handleEventEdit = (event: IEvent) => {
    // Prevent tenants from editing events
    if (isTenant) {
      toast.error(t("calendar.toast.noEditPermission"), {
        description: t("calendar.toast.noEditPermissionDesc"),
      });
      return;
    }

    setEventToEdit(event);
    setShowEventForm(true);
  };

  const handleEventView = (event: IEvent) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const handleEventDelete = async (event: IEvent) => {
    // Prevent tenants from deleting events
    if (isTenant) {
      toast.error(t("calendar.toast.noDeletePermission"), {
        description: t("calendar.toast.noDeletePermissionDesc"),
      });
      return;
    }

    try {
      const response = await fetch(`/api/calendar/events/${event._id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(t("calendar.toast.eventDeleted"));
        setShowEventDetails(false);
        setSelectedEvent(null);
        // Refresh the page to update all views
        window.location.reload();
      } else {
        toast.error(t("calendar.toast.deleteEventFailed"));
      }
    } catch {
      toast.error(t("calendar.toast.deleteEventFailed"));
    }
  };

  const tabTriggerClass = cn(
    "rounded-lg font-medium transition-all duration-200",
    "data-[state=inactive]:text-muted-foreground data-[state=active]:text-foreground",
    isLight
      ? "hover:bg-slate-200/45 data-[state=active]:bg-white/85 data-[state=active]:shadow-sm"
      : "hover:bg-white/10 data-[state=active]:!bg-white/12 data-[state=active]:!shadow-none data-[state=active]:backdrop-blur-sm"
  );

  return (
    <div className="mx-auto w-full max-w-full space-y-8 pb-6 pt-1 sm:pb-8 sm:pt-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t("calendar.header.title")}
            {isTenant && (
              <span className="ml-3 text-sm font-normal text-muted-foreground">
                {t("calendar.header.viewOnly")}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            {isTenant
              ? t("calendar.header.subtitleTenant")
              : t("calendar.header.subtitleAdmin")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {canCreateEvents && (
            <Button size="sm" onClick={() => handleCreateEvent()}>
              <Calendar className="mr-2 h-4 w-4" />
              {t("calendar.header.newEvent")}
            </Button>
          )}
          {canCreateEvents && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {t("calendar.header.calendarOptions")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowSettingsDialog(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  {t("calendar.header.settings")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Download className="mr-2 h-4 w-4" />
                  {t("calendar.header.export")}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Upload className="mr-2 h-4 w-4" />
                  {t("calendar.header.import")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <Suspense fallback={<div>{t("calendar.loading.stats")}</div>}>
        <CalendarStats />
      </Suspense>

      {/* Main Content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-8"
      >
        <TabsList
          className={cn(
            "grid h-10 w-full grid-cols-3 gap-1 rounded-xl border p-1 backdrop-blur-md",
            isLight
              ? "border-slate-200/60 bg-white/50 shadow-[0_4px_24px_rgba(15,23,42,0.05)]"
              : "border-white/12 bg-white/[0.06]"
          )}
        >
          <TabsTrigger value="calendar" className={tabTriggerClass}>
            {t("calendar.tabs.calendarView")}
          </TabsTrigger>
          <TabsTrigger value="events" className={tabTriggerClass}>
            {t("calendar.tabs.eventList")}
          </TabsTrigger>
          <TabsTrigger value="analytics" className={tabTriggerClass}>
            {t("calendar.tabs.analytics")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4 mt-4">
          <CalendarView
            onEventClick={handleEventClick}
            onCreateEvent={canCreateEvents ? handleCreateEvent : undefined}
            editable={canCreateEvents}
            selectable={canCreateEvents}
            className="min-h-[600px]"
          />
        </TabsContent>

        <TabsContent value="events" className="space-y-4 mt-4">
          <EventList
            onEventEdit={canCreateEvents ? handleEventEdit : undefined}
            onEventView={handleEventView}
            onEventCreate={
              canCreateEvents ? () => handleCreateEvent() : undefined
            }
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 mt-4">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">
                  {t("calendar.loading.analytics")}
                </div>
              </div>
            }
          >
            <CalendarAnalytics />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="dashboard-ui-surface flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden border-0 shadow-2xl">
            <CardHeader
              className={cn(
                "shrink-0 border-b",
                isLight ? "border-slate-200/70" : "border-white/10"
              )}
            >
              <CardTitle className="text-xl font-semibold text-foreground">
                {eventToEdit?._id
                  ? t("calendar.eventForm.editTitle")
                  : t("calendar.eventForm.createTitle")}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {eventToEdit?._id
                  ? t("calendar.eventForm.editDescription")
                  : t("calendar.eventForm.createDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-6">
              <EventForm
                initialData={
                  eventToEdit
                    ? {
                        title: eventToEdit.title,
                        description: eventToEdit.description,
                        type: eventToEdit.type,
                        priority: eventToEdit.priority,
                        startDate: new Date(eventToEdit.startDate),
                        startTime: new Date(eventToEdit.startDate)
                          .toTimeString()
                          .slice(0, 5),
                        endDate: new Date(eventToEdit.endDate),
                        endTime: new Date(eventToEdit.endDate)
                          .toTimeString()
                          .slice(0, 5),
                        allDay: eventToEdit.allDay,
                        locationType: eventToEdit.location?.type,
                        locationAddress: eventToEdit.location?.address,
                        onlinePlatform: eventToEdit.location?.platform,
                        meetingLink: eventToEdit.location?.meetingLink,
                        meetingId: eventToEdit.location?.meetingId,
                        passcode: eventToEdit.location?.passcode,
                        unitNumber: eventToEdit.unitNumber,
                        propertyId: eventToEdit.propertyId?.toString(),
                        tenantId: eventToEdit.tenantId?.toString(),
                        leaseId: eventToEdit.leaseId?.toString(),
                        maintenanceRequestId:
                          eventToEdit.maintenanceRequestId?.toString(),
                        attendeeEmails:
                          eventToEdit.attendees
                            ?.filter((attendee) => attendee.email)
                            .map((attendee) => attendee.email)
                            .join(", ") || "",
                        notes: eventToEdit.notes,
                      }
                    : undefined
                }
                onSubmit={async (data) => {
                  // Determine if this is an edit or create operation based on _id presence
                  const eventId =
                    eventToEdit?._id ||
                    (eventToEdit as IEvent & { id?: string })?.id;

                  const isEditOperation = !!eventId;

                  try {
                    if (isEditOperation && !eventId) {
                      toast.error(t("calendar.toast.invalidEventId"));
                      return;
                    }

                    const url = isEditOperation
                      ? `/api/calendar/events/${eventId}`
                      : "/api/calendar/events";
                    const method = isEditOperation ? "PUT" : "POST";

                    const response = await fetch(url, {
                      method,
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(data),
                    });

                    if (response.ok) {
                      toast.success(
                        isEditOperation
                          ? t("calendar.toast.eventUpdated")
                          : t("calendar.toast.eventCreated")
                      );
                      setShowEventForm(false);
                      setEventToEdit(null);
                      // Refresh calendar
                      window.location.reload();
                    } else {
                      const result = await response.json();
                      toast.error(
                        result.error ||
                          (isEditOperation
                            ? t("calendar.toast.updateEventFailed")
                            : t("calendar.toast.createEventFailed"))
                      );
                    }
                  } catch {
                    toast.error(
                      isEditOperation
                        ? t("calendar.toast.updateEventFailed")
                        : t("calendar.toast.createEventFailed")
                    );
                  }
                }}
                onCancel={() => {
                  setShowEventForm(false);
                  setEventToEdit(null);
                }}
                loading={false}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Event Details Dialog */}
      {selectedEvent && (
        <EventDetailsDialog
          event={selectedEvent}
          open={showEventDetails}
          onOpenChange={setShowEventDetails}
          onEdit={canCreateEvents ? handleEventEdit : undefined}
          onDelete={
            canCreateEvents
              ? () => {
                  if (selectedEvent) {
                    handleEventDelete(selectedEvent);
                  }
                }
              : undefined
          }
          onDuplicate={
            canCreateEvents
              ? (event: IEvent) => {
                  // Create a copy of the event for duplication
                  const eventCopy = {
                    title: `${event.title} ${t("calendar.actions.copySuffix")}`,
                    description: event.description,
                    type: event.type,
                    priority: event.priority,
                    startDate: event.startDate,
                    endDate: event.endDate,
                    allDay: event.allDay,
                    location: event.location,
                    unitNumber: event.unitNumber,
                    propertyId: event.propertyId,
                    tenantId: event.tenantId,
                    leaseId: event.leaseId,
                    maintenanceRequestId: event.maintenanceRequestId,
                    notes: event.notes,
                  } as IEvent;
                  setEventToEdit(eventCopy);
                  setShowEventForm(true);
                  setShowEventDetails(false);
                }
              : undefined
          }
        />
      )}

      {/* Calendar Settings Dialog */}
      <CalendarSettings
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
        settings={calendarSettings}
        onSettingsChange={setCalendarSettings}
      />

      {/* Google Calendar Sync Dialog */}
      <GoogleCalendarSync
        open={showGoogleSync}
        onOpenChange={setShowGoogleSync}
        onSyncComplete={() => {
          // Refresh events after sync
          const calendarApi = calendarRef.current?.getApi();
          if (calendarApi) {
            const view = calendarApi.view;
            fetchEvents(view.activeStart, view.activeEnd);
          }
        }}
      />
    </div>
  );
}
