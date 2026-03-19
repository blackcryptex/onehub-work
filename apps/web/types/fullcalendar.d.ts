declare module '@fullcalendar/core' {
  export type PluginDef = unknown;

  export type EventClickArg = {
    event: {
      title: string;
      url?: string;
      extendedProps: Record<string, unknown>;
    };
  };

  export type DatesSetArg = {
    start: Date;
    end: Date;
  };
}

