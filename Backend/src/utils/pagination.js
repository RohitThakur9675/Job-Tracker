// Shared list-endpoint pagination helper: ?page=2&limit=20
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export function getPagination(query) {
  const page = Math.max(1, Number.parseInt(query?.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(query?.limit, 10) || DEFAULT_LIMIT));
  return { page, limit, skip: (page - 1) * limit };
}

export function paginatedResponse(items, total, { page, limit }) {
  return {
    items,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}
