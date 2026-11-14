import { useEffect, useMemo, useState } from 'react';
import {
  Bike,
  Eye,
  FileDown,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { FormField, Modal, PageHeading } from '../components/ui';
import { useAuth } from '../auth/useAuth';
import {
  createVehicle,
  deleteVehicle,
  getVehicle,
  getVehicleCatalogs,
  listVehicles,
  updateVehicle,
  VehiclesApiError,
  type VehicleInput,
  type VehicleRecord,
} from '../services/vehiclesApi';
import { formatMoney, stockLabel } from '../utils';

const EMPTY_VEHICLES: VehicleRecord[] = [];
const EMPTY_CATALOGS = { brands: [], categories: [] };

function getErrorMessage(error: unknown): string {
  if (error instanceof VehiclesApiError) {
    if (error.status === 401) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    }
    if (error.status === 403) {
      return 'Tài khoản không có quyền quản lý xe.';
    }
    if (error.status === 404) {
      return 'Không tìm thấy mẫu xe. Danh sách có thể đã được cập nhật.';
    }
    if (error.status === 409) {
      return 'Dữ liệu bị trùng hoặc xe đang được tham chiếu trong chứng từ.';
    }
    if (error.kind === 'network') {
      return 'Không thể kết nối dịch vụ quản lý xe. Vui lòng thử lại.';
    }
    return 'Không thể tải hoặc lưu dữ liệu xe. Vui lòng thử lại.';
  }
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.';
}

function VehiclePhoto({
  imageUrl,
  alt,
  className,
}: {
  imageUrl: string | null;
  alt: string;
  className: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={`vehicle-photo ${className}`}
      role={!imageUrl || failed ? 'img' : undefined}
      aria-label={!imageUrl || failed ? `${alt} chưa có ảnh` : undefined}
    >
      {!imageUrl || failed ? (
        <Bike size={22} aria-hidden="true" />
      ) : (
        <img
          src={imageUrl}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export function CarsPage() {
  const { accessToken } = useAuth();
  const [params, setParams] = useSearchParams();
  const [loadedData, setLoadedData] = useState<{
    accessToken: string;
    reloadKey: number;
    vehicles: VehicleRecord[];
    catalogs: {
      brands: Array<{ id: string; name: string }>;
      categories: Array<{ id: string; name: string }>;
    };
    error: string | null;
  } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [brandFilter, setBrandFilter] = useState('Tất cả hãng');
  const [categoryFilter, setCategoryFilter] = useState('Tất cả dòng xe');
  const [stockFilter, setStockFilter] = useState('Mọi trạng thái');
  const [editing, setEditing] = useState<VehicleRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<VehicleRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!accessToken) return;

    const controller = new AbortController();
    Promise.all([
      listVehicles(accessToken, controller.signal),
      getVehicleCatalogs(accessToken, controller.signal),
    ])
      .then(([nextVehicles, nextCatalogs]) => {
        setLoadedData({
          accessToken,
          reloadKey,
          vehicles: nextVehicles,
          catalogs: nextCatalogs,
          error: null,
        });
      })
      .catch((issue: unknown) => {
        if (!controller.signal.aborted) {
          setLoadedData({
            accessToken,
            reloadKey,
            vehicles: [],
            catalogs: { brands: [], categories: [] },
            error: getErrorMessage(issue),
          });
        }
      });

    return () => controller.abort();
  }, [accessToken, reloadKey]);

  const currentData =
    loadedData?.accessToken === accessToken &&
    loadedData.reloadKey === reloadKey
      ? loadedData
      : null;
  const vehicles = currentData?.vehicles ?? EMPTY_VEHICLES;
  const catalogs = currentData?.catalogs ?? EMPTY_CATALOGS;
  const loading = Boolean(accessToken) && currentData === null;
  const error =
    !accessToken
      ? 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.'
      : actionError ?? currentData?.error ?? null;

  function updateVehicles(
    update: (current: VehicleRecord[]) => VehicleRecord[],
  ) {
    setLoadedData((current) => {
      if (
        !current ||
        current.accessToken !== accessToken ||
        current.reloadKey !== reloadKey
      ) {
        return current;
      }
      return { ...current, vehicles: update(current.vehicles) };
    });
  }

  const visibleVehicles = useMemo(() => {
    const normalizedQuery = query.toLocaleLowerCase('vi');
    return vehicles.filter((vehicle) => {
      const text =
        `${vehicle.name} ${vehicle.brandName} ${vehicle.code}`.toLocaleLowerCase(
          'vi',
        );
      return (
        text.includes(normalizedQuery) &&
        (brandFilter === 'Tất cả hãng' ||
          vehicle.brandName === brandFilter) &&
        (categoryFilter === 'Tất cả dòng xe' ||
          vehicle.categoryName === categoryFilter) &&
        (stockFilter === 'Mọi trạng thái' ||
          stockLabel(vehicle.stockQuantity) === stockFilter)
      );
    });
  }, [brandFilter, categoryFilter, query, stockFilter, vehicles]);

  function openCreateForm() {
    setEditing(null);
    setFormError(null);
    setCreating(true);
  }

  function openEditForm(vehicle: VehicleRecord) {
    setCreating(false);
    setFormError(null);
    setEditing(vehicle);
  }

  async function openDetails(vehicle: VehicleRecord) {
    setDetail(vehicle);
    setDetailError(null);
    setDetailLoading(true);
    if (!accessToken) {
      setDetailError('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
      setDetailLoading(false);
      return;
    }
    try {
      setDetail(await getVehicle(accessToken, vehicle.id));
    } catch (issue) {
      setDetailError(getErrorMessage(issue));
    } finally {
      setDetailLoading(false);
    }
  }

  async function submitVehicle(form: FormData) {
    if (!accessToken) {
      setFormError('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
      return;
    }
    const imageUrl = String(form.get('imageUrl') ?? '').trim();
    const input: VehicleInput = {
      code: String(form.get('code') ?? '').trim(),
      name: String(form.get('name') ?? '').trim(),
      brandId: String(form.get('brandId') ?? ''),
      categoryId: String(form.get('categoryId') ?? ''),
      displacementCc: Number(form.get('displacementCc')),
      modelYear: Number(form.get('modelYear')),
      color: String(form.get('color') ?? '').trim(),
      costPrice: String(form.get('costPrice') ?? ''),
      salePrice: String(form.get('salePrice') ?? ''),
      stockQuantity: Number(form.get('stockQuantity')),
      imageUrl: imageUrl || null,
    };

    setSaving(true);
    setFormError(null);
    try {
      const saved = creating
        ? await createVehicle(accessToken, input)
        : editing
          ? await updateVehicle(accessToken, editing.id, input)
          : null;
      if (!saved) return;
      updateVehicles((current) =>
        creating
          ? [saved, ...current]
          : current.map((vehicle) => (vehicle.id === saved.id ? saved : vehicle)),
      );
      setCreating(false);
      setEditing(null);
    } catch (issue) {
      setFormError(getErrorMessage(issue));
    } finally {
      setSaving(false);
    }
  }

  async function removeVehicle(vehicle: VehicleRecord) {
    if (!window.confirm(`Xóa mẫu xe ${vehicle.name} khỏi danh mục?`)) return;
    if (!accessToken) {
      setActionError('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
      return;
    }
    setActionError(null);
    try {
      await deleteVehicle(accessToken, vehicle.id);
      updateVehicles((current) =>
        current.filter((item) => item.id !== vehicle.id),
      );
      if (detail?.id === vehicle.id) setDetail(null);
    } catch (issue) {
      setActionError(getErrorMessage(issue));
    }
  }

  const formOpen = creating || editing !== null;
  const catalogAvailable =
    catalogs.brands.length > 0 && catalogs.categories.length > 0;

  return (
    <>
      <PageHeading
        eyebrow="KHO HÀNG · DANH MỤC SẢN PHẨM"
        title="Quản lý xe"
        description="Theo dõi danh mục, giá bán và số lượng tồn kho."
        action={
          <>
            <button className="button button-quiet hide-small">
              <FileDown size={16} /> Xuất danh sách
            </button>
            <button
              className="button button-primary"
              onClick={openCreateForm}
              disabled={!catalogAvailable}
              title={
                catalogAvailable
                  ? undefined
                  : 'Cần có hãng xe và dòng xe trong cơ sở dữ liệu trước.'
              }
            >
              <Plus size={16} /> Thêm xe mới
            </button>
          </>
        }
      />
      {error && (
        <div className="vehicle-feedback vehicle-feedback-error" role="alert">
          <span>{error}</span>
          <button
            className="button button-quiet"
            onClick={() => {
              setActionError(null);
              setReloadKey((value) => value + 1);
            }}
          >
            Thử lại
          </button>
        </div>
      )}
      {!catalogAvailable && !loading && !error && (
        <div className="vehicle-feedback" role="status">
          Chưa có hãng xe hoặc dòng xe trong cơ sở dữ liệu; cần tạo catalog trước
          khi thêm mẫu xe.
        </div>
      )}
      <section className="inventory-summary">
        <div>
          <span className="summary-icon"><i /></span>
          <div>
            <span>Tổng mẫu xe</span>
            <strong>{vehicles.length} <small>mẫu</small></strong>
          </div>
        </div>
        <div>
          <span className="summary-icon summary-orange"><i /></span>
          <div>
            <span>Tổng xe trong kho</span>
            <strong>
              {vehicles.reduce((sum, vehicle) => sum + vehicle.stockQuantity, 0)}{' '}
              <small>xe</small>
            </strong>
          </div>
        </div>
        <div>
          <span className="summary-icon summary-red"><i /></span>
          <div>
            <span>Cần nhập thêm</span>
            <strong>
              {vehicles.filter((vehicle) => vehicle.stockQuantity <= 2).length}{' '}
              <small>mẫu</small>
            </strong>
          </div>
        </div>
        <div className="inventory-progress">
          <span>Tình trạng kho</span>
          <div className="progress-track">
            <i
              style={{
                width: `${Math.max(
                  4,
                  (vehicles.filter((vehicle) => vehicle.stockQuantity > 2)
                    .length /
                    Math.max(1, vehicles.length)) *
                    100,
                )}%`,
              }}
            />
          </div>
          <small>
            {vehicles.filter((vehicle) => vehicle.stockQuantity > 2).length}{' '}
            mẫu đủ hàng
          </small>
        </div>
      </section>
      <section className="panel inventory-table-panel">
        <div className="table-toolbar">
          <div className="toolbar-title">
            <h2>Danh sách xe</h2>
            <span className="result-count">{visibleVehicles.length}</span>
          </div>
          <div className="filter-tools">
            <label className="search-control">
              <Search size={16} />
              <input
                placeholder="Tìm tên hoặc mã xe..."
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setParams(event.target.value ? { q: event.target.value } : {});
                }}
              />
            </label>
            <select
              value={brandFilter}
              onChange={(event) => setBrandFilter(event.target.value)}
            >
              <option>Tất cả hãng</option>
              {catalogs.brands.map((brand) => (
                <option key={brand.id}>{brand.name}</option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option>Tất cả dòng xe</option>
              {catalogs.categories.map((category) => (
                <option key={category.id}>{category.name}</option>
              ))}
            </select>
            <select
              value={stockFilter}
              onChange={(event) => setStockFilter(event.target.value)}
            >
              <option>Mọi trạng thái</option>
              <option>Đang kinh doanh</option>
              <option>Sắp hết hàng</option>
              <option>Hết hàng</option>
            </select>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table bike-table">
            <thead>
              <tr>
                <th>SẢN PHẨM</th>
                <th>MÃ XE</th>
                <th>HÃNG / DÒNG XE</th>
                <th>GIÁ BÁN</th>
                <th>TỒN KHO</th>
                <th>TRẠNG THÁI</th>
                <th><span className="sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {visibleVehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td>
                    <div className="bike-cell">
                      <VehiclePhoto
                        key={`${vehicle.id}-${vehicle.imageUrl ?? ''}`}
                        imageUrl={vehicle.imageUrl}
                        alt={vehicle.name}
                        className="vehicle-photo-list"
                      />
                      <div>
                        <strong>{vehicle.name}</strong>
                        <span>
                          {vehicle.displacementCc} cc · {vehicle.modelYear}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td><span className="code-label">{vehicle.code}</span></td>
                  <td>
                    <div className="brand-cell">
                      <strong>{vehicle.brandName}</strong>
                      <span>{vehicle.categoryName}</span>
                    </div>
                  </td>
                  <td>
                    <strong className="price-cell">
                      {formatMoney(Number(vehicle.salePrice))}
                    </strong>
                    <span className="cost-cell">
                      Giá nhập {formatMoney(Number(vehicle.costPrice))}
                    </span>
                  </td>
                  <td>
                    <strong className="stock-number">
                      {vehicle.stockQuantity}
                    </strong>
                    <span className="stock-unit">xe</span>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${
                        vehicle.stockQuantity === 0
                          ? 'status-muted'
                          : vehicle.stockQuantity <= 2
                            ? 'status-warning'
                            : 'status-success'
                      }`}
                    >
                      <i />{stockLabel(vehicle.stockQuantity)}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-button"
                        onClick={() => void openDetails(vehicle)}
                        aria-label="Xem chi tiết"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="icon-button"
                        onClick={() => openEditForm(vehicle)}
                        aria-label="Chỉnh sửa"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-button danger-hover"
                        onClick={() => void removeVehicle(vehicle)}
                        aria-label="Xóa"
                      >
                        <Trash2 size={15} />
                      </button>
                      <button className="icon-button hide-wide" aria-label="Thao tác khác">
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="table-empty">Đang tải dữ liệu xe...</div>}
          {!loading && !error && visibleVehicles.length === 0 && (
            <div className="table-empty">
              {vehicles.length === 0
                ? 'Cơ sở dữ liệu chưa có mẫu xe.'
                : 'Không tìm thấy mẫu xe phù hợp với bộ lọc.'}
            </div>
          )}
        </div>
        <div className="table-footer">
          <span>
            Hiển thị <strong>{visibleVehicles.length}</strong> trên{' '}
            <strong>{vehicles.length}</strong> mẫu xe
          </span>
          <span className="footer-status"><i /> Đồng bộ từ cơ sở dữ liệu</span>
        </div>
      </section>
      {formOpen && (
        <Modal
          title={
            editing ? `Chỉnh sửa ${editing.name}` : 'Thêm xe mới'
          }
          onClose={() => {
            setCreating(false);
            setEditing(null);
            setFormError(null);
          }}
          wide
        >
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              void submitVehicle(new FormData(event.currentTarget));
            }}
          >
            {formError && (
              <div
                className="vehicle-feedback vehicle-feedback-error form-error"
                role="alert"
              >
                {formError}
              </div>
            )}
            <FormField label="Mã xe">
              <input
                name="code"
                required
                maxLength={40}
                defaultValue={editing?.code ?? ''}
                placeholder="Ví dụ: MOTO-001"
              />
            </FormField>
            <FormField label="Tên xe">
              <input
                name="name"
                required
                maxLength={180}
                defaultValue={editing?.name ?? ''}
                placeholder="Ví dụ: CBR650R"
              />
            </FormField>
            <FormField label="Hãng xe">
              <select
                name="brandId"
                required
                defaultValue={
                  editing?.brandId ?? catalogs.brands[0]?.id ?? ''
                }
              >
                {catalogs.brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Dòng xe">
              <select
                name="categoryId"
                required
                defaultValue={
                  editing?.categoryId ?? catalogs.categories[0]?.id ?? ''
                }
              >
                {catalogs.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Dung tích (cc)">
              <input
                name="displacementCc"
                type="number"
                min="1"
                max="2147483647"
                required
                defaultValue={editing?.displacementCc ?? ''}
              />
            </FormField>
            <FormField label="Năm sản xuất">
              <input
                name="modelYear"
                type="number"
                min="1900"
                max="2200"
                required
                defaultValue={editing?.modelYear ?? new Date().getFullYear()}
              />
            </FormField>
            <FormField label="Màu sắc">
              <input
                name="color"
                required
                maxLength={60}
                defaultValue={editing?.color ?? ''}
                placeholder="Đen nhám"
              />
            </FormField>
            <FormField label="Số lượng tồn">
              <input
                name="stockQuantity"
                type="number"
                min="0"
                max="2147483647"
                required
                defaultValue={editing?.stockQuantity ?? 0}
              />
            </FormField>
            <FormField label="Giá nhập (VNĐ)">
              <input
                name="costPrice"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={editing?.costPrice ?? ''}
              />
            </FormField>
            <FormField label="Giá bán (VNĐ)">
              <input
                name="salePrice"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={editing?.salePrice ?? ''}
              />
            </FormField>
            <FormField label="URL hình ảnh">
              <input
                name="imageUrl"
                type="url"
                maxLength={2048}
                defaultValue={editing?.imageUrl ?? ''}
                placeholder="https://..."
              />
            </FormField>
            {!catalogAvailable && (
              <div className="vehicle-feedback form-error" role="alert">
                Không có hãng xe hoặc dòng xe để chọn trong cơ sở dữ liệu.
              </div>
            )}
            <div className="form-actions-wide">
              <div className="modal-actions">
                <button
                type="button"
                className="button button-quiet"
                onClick={() => {
                  setCreating(false);
                  setEditing(null);
                  setFormError(null);
                }}
                >
                Hủy
                </button>
                <button
                type="submit"
                className="button button-primary"
                disabled={saving || !catalogAvailable}
                >
                {saving ? 'Đang lưu...' : 'Lưu thông tin'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
      {detail && (
        <Modal title="Thông tin xe" onClose={() => setDetail(null)}>
          <div className="bike-detail">
            <VehiclePhoto
              key={`${detail.id}-${detail.imageUrl ?? ''}`}
              imageUrl={detail.imageUrl}
              alt={detail.name}
              className="vehicle-photo-detail"
            />
            {detailLoading && (
              <div className="vehicle-detail-status" role="status">
                Đang tải thông tin từ cơ sở dữ liệu...
              </div>
            )}
            {detailError && (
              <div
                className="vehicle-feedback vehicle-feedback-error"
                role="alert"
              >
                {detailError}
              </div>
            )}
            <span className="eyebrow">{detail.code} · {detail.brandName}</span>
            <h3>{detail.name}</h3>
            <span>
              {detail.categoryName} · {detail.displacementCc} cc ·{' '}
              {detail.modelYear}
            </span>
            <div className="detail-price">
              <span>Giá bán</span>
              <strong>{formatMoney(Number(detail.salePrice))}</strong>
            </div>
            <div className="detail-pairs">
              <span>Màu sắc <b>{detail.color}</b></span>
              <span>Giá nhập <b>{formatMoney(Number(detail.costPrice))}</b></span>
              <span>Tồn kho <b>{detail.stockQuantity} xe</b></span>
              <span>Trạng thái <b>{stockLabel(detail.stockQuantity)}</b></span>
            </div>
            <button
              className="button button-primary button-full"
              onClick={() => {
                setDetail(null);
                openEditForm(detail);
              }}
            >
              <Pencil size={15} /> Chỉnh sửa thông tin
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
