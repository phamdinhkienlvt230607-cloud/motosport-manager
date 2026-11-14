import { API_BASE_URL } from '../config/api';

export interface VehicleRecord {
  id: string;
  code: string;
  name: string;
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  displacementCc: number;
  modelYear: number;
  color: string;
  engineNumber: string | null;
  vin: string | null;
  costPrice: string;
  salePrice: string;
  stockQuantity: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleCatalogs {
  brands: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
}

export interface VehicleInput {
  code: string;
  name: string;
  brandId: string;
  categoryId: string;
  displacementCc: number;
  modelYear: number;
  color: string;
  costPrice: string;
  salePrice: string;
  stockQuantity: number;
  imageUrl: string | null;
}

type VehiclesApiErrorKind = 'network' | 'http' | 'invalid-response' | 'aborted';

export class VehiclesApiError extends Error {
  readonly kind: VehiclesApiErrorKind;
  readonly status?: number;

  constructor(kind: VehiclesApiErrorKind, status?: number) {
    super('Vehicle request failed.');
    this.name = 'VehiclesApiError';
    this.kind = kind;
    this.status = status;
  }
}

interface VehicleListResponse {
  data: VehicleRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

function isVehicleRecord(value: unknown): value is VehicleRecord {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.code) &&
    isString(value.name) &&
    isString(value.brandId) &&
    isString(value.brandName) &&
    isString(value.categoryId) &&
    isString(value.categoryName) &&
    isNonNegativeInteger(value.displacementCc) &&
    isNonNegativeInteger(value.modelYear) &&
    isString(value.color) &&
    isNullableString(value.engineNumber) &&
    isNullableString(value.vin) &&
    typeof value.costPrice === 'string' &&
    /^\d+(?:\.\d{1,2})?$/.test(value.costPrice) &&
    typeof value.salePrice === 'string' &&
    /^\d+(?:\.\d{1,2})?$/.test(value.salePrice) &&
    isNonNegativeInteger(value.stockQuantity) &&
    isNullableString(value.imageUrl) &&
    typeof value.isActive === 'boolean' &&
    isString(value.createdAt) &&
    !Number.isNaN(Date.parse(value.createdAt)) &&
    isString(value.updatedAt) &&
    !Number.isNaN(Date.parse(value.updatedAt))
  );
}

function isVehicleListResponse(value: unknown): value is VehicleListResponse {
  if (!isRecord(value) || !Array.isArray(value.data) || !isRecord(value.pagination)) {
    return false;
  }
  const { pagination } = value;
  return (
    value.data.every(isVehicleRecord) &&
    Number.isSafeInteger(pagination.page) &&
    Number(pagination.page) > 0 &&
    Number.isSafeInteger(pagination.limit) &&
    Number(pagination.limit) > 0 &&
    isNonNegativeInteger(pagination.total) &&
    isNonNegativeInteger(pagination.totalPages)
  );
}

function isVehicleCatalogs(value: unknown): value is VehicleCatalogs {
  return (
    isRecord(value) &&
    Array.isArray(value.brands) &&
    value.brands.every(
      (item) =>
        isRecord(item) && isString(item.id) && isString(item.name),
    ) &&
    Array.isArray(value.categories) &&
    value.categories.every(
      (item) =>
        isRecord(item) && isString(item.id) && isString(item.name),
    )
  );
}

async function request(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...init.headers,
      },
    });
  } catch {
    if (init.signal?.aborted) throw new VehiclesApiError('aborted');
    throw new VehiclesApiError('network');
  }

  if (!response.ok) {
    throw new VehiclesApiError('http', response.status);
  }
  return response;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new VehiclesApiError('invalid-response');
  }
}

async function getVehiclePage(
  accessToken: string,
  page: number,
  signal?: AbortSignal,
): Promise<VehicleListResponse> {
  const params = new URLSearchParams({ page: String(page), limit: '100' });
  const response = await request(
    `/vehicles?${params.toString()}`,
    accessToken,
    { method: 'GET', signal },
  );
  const body: unknown = await readJson(response);
  if (!isVehicleListResponse(body) || body.pagination.page !== page) {
    throw new VehiclesApiError('invalid-response');
  }
  return body;
}

export async function listVehicles(
  accessToken: string,
  signal?: AbortSignal,
): Promise<VehicleRecord[]> {
  const firstPage = await getVehiclePage(accessToken, 1, signal);
  if (firstPage.pagination.totalPages > 10_000) {
    throw new VehiclesApiError('invalid-response');
  }

  const vehicles = [...firstPage.data];
  for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
    const result = await getVehiclePage(accessToken, page, signal);
    vehicles.push(...result.data);
  }
  return vehicles;
}

export async function getVehicleCatalogs(
  accessToken: string,
  signal?: AbortSignal,
): Promise<VehicleCatalogs> {
  const response = await request('/vehicles/catalogs', accessToken, {
    method: 'GET',
    signal,
  });
  const body: unknown = await readJson(response);
  if (!isVehicleCatalogs(body)) {
    throw new VehiclesApiError('invalid-response');
  }
  return body;
}

export async function getVehicle(
  accessToken: string,
  id: string,
  signal?: AbortSignal,
): Promise<VehicleRecord> {
  const response = await request(
    `/vehicles/${encodeURIComponent(id)}`,
    accessToken,
    { method: 'GET', signal },
  );
  const body: unknown = await readJson(response);
  if (!isVehicleRecord(body)) {
    throw new VehiclesApiError('invalid-response');
  }
  return body;
}

async function writeVehicle(
  path: string,
  accessToken: string,
  method: 'POST' | 'PATCH',
  input: VehicleInput,
): Promise<VehicleRecord> {
  const response = await request(path, accessToken, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body: unknown = await readJson(response);
  if (!isVehicleRecord(body)) {
    throw new VehiclesApiError('invalid-response');
  }
  return body;
}

export function createVehicle(
  accessToken: string,
  input: VehicleInput,
): Promise<VehicleRecord> {
  return writeVehicle('/vehicles', accessToken, 'POST', input);
}

export function updateVehicle(
  accessToken: string,
  id: string,
  input: VehicleInput,
): Promise<VehicleRecord> {
  return writeVehicle(
    `/vehicles/${encodeURIComponent(id)}`,
    accessToken,
    'PATCH',
    input,
  );
}

export async function deleteVehicle(
  accessToken: string,
  id: string,
): Promise<void> {
  const response = await request(
    `/vehicles/${encodeURIComponent(id)}`,
    accessToken,
    { method: 'DELETE' },
  );
  if (response.status !== 204) {
    throw new VehiclesApiError('invalid-response', response.status);
  }
}
