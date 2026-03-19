/**
 * Navigation helpers - type definitions for callback functions
 * Components will use callbacks passed from Dashboard
 */

export type NavigateToTab = (eventId: string, tab: string) => void;
export type NavigateToEvent = (eventId: string) => void;
export type NavigateToRoute = (route: string) => void;
