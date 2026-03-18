import {
  DEFAULT_PAGE,
  DEFAULT_SORT_DIRECTION,
  EVENT_SORT_FIELDS,
  EventStatus,
  SMALL_PAGE_SIZE,
  SORT_DIRECTIONS,
} from '@spexs/types';
import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsStringLiteral,
} from 'nuqs/server';

// ── Tab ───────────────────────────────────────────────────────────────────────

const WORKFLOW_TAB_VALUES = ['canvas', 'history'] as const;
export type WorkflowTab = (typeof WORKFLOW_TAB_VALUES)[number];

export const workflowTabParser = parseAsStringLiteral(WORKFLOW_TAB_VALUES);

// ── History pagination ────────────────────────────────────────────────────────

const EVENT_STATUS_VALUES = Object.values(EventStatus) as [
  EventStatus,
  ...EventStatus[],
];

const SORT_DIRECTION_VALUES = [
  SORT_DIRECTIONS.ASC,
  SORT_DIRECTIONS.DESC,
] as const;

type EventSortFieldValue =
  (typeof EVENT_SORT_FIELDS)[keyof typeof EVENT_SORT_FIELDS];
const EVENT_SORT_FIELD_VALUES = Object.values(EVENT_SORT_FIELDS);

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

// ── Server-side cache (used in page.tsx for prefetching) ──────────────────────

export const workflowDetailSearchParamsCache = createSearchParamsCache({
  tab: workflowTabParser,
  page: historyPageParser,
  pageSize: historyPageSizeParser,
  status: historyStatusParser,
  sortBy: historySortByParser,
  sortDirection: historySortDirectionParser,
});
