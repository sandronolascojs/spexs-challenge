import {
  AlertEventStatus,
  DEFAULT_PAGE,
  DEFAULT_SORT_DIRECTION,
  EVENT_SORT_FIELDS,
  SMALL_PAGE_SIZE,
  SORT_DIRECTIONS,
} from '@spexs/types';
import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from 'nuqs/server';

// ── Workflow tab ──────────────────────────────────────────────────────────────

const WORKFLOW_TAB_VALUES = ['canvas', 'history'] as const;
export type WorkflowTab = (typeof WORKFLOW_TAB_VALUES)[number];
export const WORKFLOW_TABS = {
  CANVAS: 'canvas',
  HISTORY: 'history',
} as const satisfies Record<string, WorkflowTab>;

export const workflowTabParser = parseAsStringLiteral(WORKFLOW_TAB_VALUES);

// ── Workflow new-page mode ────────────────────────────────────────────────────

const WORKFLOW_MODE_VALUES = ['scratch'] as const;
export type WorkflowMode = (typeof WORKFLOW_MODE_VALUES)[number];
export const WORKFLOW_MODES = {
  SCRATCH: 'scratch',
} as const satisfies Record<string, WorkflowMode>;

export const workflowModeParser = parseAsStringLiteral(WORKFLOW_MODE_VALUES);

// ── Events page filters ───────────────────────────────────────────────────────

const EVENT_STATUS_VALUES = Object.values(AlertEventStatus);

export const EVENTS_ALL_STATUS = 'all' as const;
export type EventStatusFilter = AlertEventStatus | typeof EVENTS_ALL_STATUS;

const EVENT_STATUS_FILTER_VALUES = [
  EVENTS_ALL_STATUS,
  ...EVENT_STATUS_VALUES,
] as const;

export const eventsPageParser = parseAsInteger.withDefault(DEFAULT_PAGE);
export const eventsWorkflowParser = parseAsString.withDefault('');
export const eventsStatusParser = parseAsStringLiteral(
  EVENT_STATUS_FILTER_VALUES,
).withDefault(EVENTS_ALL_STATUS);

// ── Workflow detail history ───────────────────────────────────────────────────

const SORT_DIRECTION_VALUES = [
  SORT_DIRECTIONS.ASC,
  SORT_DIRECTIONS.DESC,
] as const;

type EventSortFieldValue =
  (typeof EVENT_SORT_FIELDS)[keyof typeof EVENT_SORT_FIELDS];
const EVENT_SORT_FIELD_VALUES = Object.values(
  EVENT_SORT_FIELDS,
) as EventSortFieldValue[];

export const historyPageParser = parseAsInteger.withDefault(DEFAULT_PAGE);
export const historyPageSizeParser =
  parseAsInteger.withDefault(SMALL_PAGE_SIZE);
export const historyStatusParser = parseAsStringLiteral(EVENT_STATUS_VALUES);
export const historySortByParser = parseAsStringLiteral(
  EVENT_SORT_FIELD_VALUES,
).withDefault(EVENT_SORT_FIELDS.OPENED_AT);
export const historySortDirectionParser = parseAsStringLiteral(
  SORT_DIRECTION_VALUES,
).withDefault(DEFAULT_SORT_DIRECTION);

// ── Server-side caches (used in page.tsx for SSR prefetching) ─────────────────

export const workflowDetailSearchParamsCache = createSearchParamsCache({
  tab: workflowTabParser,
  page: historyPageParser,
  pageSize: historyPageSizeParser,
  status: historyStatusParser,
  sortBy: historySortByParser,
  sortDirection: historySortDirectionParser,
});

export const workflowNewSearchParamsCache = createSearchParamsCache({
  mode: workflowModeParser,
});

export const eventsSearchParamsCache = createSearchParamsCache({
  page: eventsPageParser,
  status: eventsStatusParser,
  workflow: eventsWorkflowParser,
});
