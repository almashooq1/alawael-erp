// نظام إدارة الأصول والمخزون
class AssetsManager {
    constructor() {
        this.assets = [];
        this.assetCategories = [];
        this.inventoryItems = [];
        this.init();
    }

    init() {
        this.loadAssets();
        this.loadAssetCategories();
        this.loadInventory();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            setInterval(() => {
                if (document.getElementById('assets').style.display !== 'none') {
                    this.loadAssets();
                }
                if (document.getElementById('inventory').style.display !== 'none') {
                    this.loadInventory();
                }
            }, 60000);
        });
    }

    // إدارة الأصول
    async loadAssets() {
        try {
            const response = await fetch('/api/assets', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.assets = data.assets;
                this.renderAssets();
                this.updateAssetsStats();
            }
        } catch (error) {
            console.error('خطأ في تحميل الأصول:', error);
        }
    }

    async loadAssetCategories() {
        try {
            const response = await fetch('/api/asset-categories', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.assetCategories = data.categories;
                this.populateAssetCategoryFilter();
            }
        } catch (error) {
            console.error('خطأ في تحميل فئات الأصول:', error);
        }
    }

    renderAssets() {
        const tbody = document.getElementById('assetsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.assets.forEach(asset => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <i class="fas fa-${this.getAssetIcon(asset.category)} me-2"></i>
                        <div>
                            <strong>${asset.name}</strong>
                            <br>
                            <small class="text-muted">${asset.asset_tag || 'لا يوجد رقم'}</small>
                        </div>
                    </div>
                </td>
                <td>${this.getAssetCategoryName(asset.category_id)}</td>
                <td>
                    <span class="badge bg-${this.getAssetStatusColor(asset.status)}">
                        ${this.getAssetStatusText(asset.status)}
                    </span>
                </td>
                <td>${asset.location || 'غير محدد'}</td>
                <td>${asset.purchase_price ? asset.purchase_price + ' ريال' : 'غير محدد'}</td>
                <td>${asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString('ar-SA') : 'غير محدد'}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="assetsManager.viewAsset(${asset.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="assetsManager.editAsset(${asset.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-warning" onclick="assetsManager.maintenanceAsset(${asset.id})">
                            <i class="fas fa-wrench"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    updateAssetsStats() {
        const total = this.assets.length;
        const active = this.assets.filter(a => a.status === 'active').length;
        const maintenance = this.assets.filter(a => a.status === 'maintenance').length;
        const disposed = this.assets.filter(a => a.status === 'disposed').length;

        document.getElementById('totalAssets').textContent = total;
        document.getElementById('activeAssets').textContent = active;
        document.getElementById('maintenanceAssets').textContent = maintenance;
        document.getElementById('disposedAssets').textContent = disposed;
    }

    getAssetIcon(category) {
        const icons = {
            'computer': 'desktop',
            'furniture': 'chair',
            'vehicle': 'car',
            'equipment': 'tools',
            'other': 'box'
        };
        return icons[category] || 'box';
    }

    getAssetStatusColor(status) {
        const colors = {
            'active': 'success',
            'inactive': 'secondary',
            'maintenance': 'warning',
            'disposed': 'danger'
        };
        return colors[status] || 'secondary';
    }

    getAssetStatusText(status) {
        const texts = {
            'active': 'نشط',
            'inactive': 'غير نشط',
            'maintenance': 'صيانة',
            'disposed': 'مستبعد'
        };
        return texts[status] || 'غير محدد';
    }

    getAssetCategoryName(categoryId) {
        const category = this.assetCategories.find(c => c.id === categoryId);
        return category ? category.name : 'غير محدد';
    }

    populateAssetCategoryFilter() {
        const select = document.getElementById('assetCategoryFilter');
        if (!select) return;

        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        this.assetCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    }

    // إدارة المخزون
    async loadInventory() {
        try {
            const response = await fetch('/api/inventory', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.inventoryItems = data.inventory_items;
                this.renderInventory();
                this.updateInventoryStats();
            }
        } catch (error) {
            console.error('خطأ في تحميل المخزون:', error);
        }
    }

    renderInventory() {
        const tbody = document.getElementById('inventoryTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.inventoryItems.forEach(item => {
            const row = document.createElement('tr');
            const lowStock = item.current_quantity <= item.minimum_quantity;
            
            if (lowStock) {
                row.className = 'table-warning';
            }
            
            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <i class="fas fa-box me-2"></i>
                        <div>
                            <strong>${item.name}</strong>
                            <br>
                            <small class="text-muted">${item.sku || 'لا يوجد رمز'}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge bg-${lowStock ? 'danger' : 'success'}">
                        ${item.current_quantity}
                    </span>
                    ${lowStock ? '<i class="fas fa-exclamation-triangle text-warning ms-1"></i>' : ''}
                </td>
                <td>${item.minimum_quantity}</td>
                <td>${item.unit}</td>
                <td>${item.unit_price ? item.unit_price + ' ريال' : 'غير محدد'}</td>
                <td>${item.location || 'غير محدد'}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="assetsManager.viewInventoryItem(${item.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="assetsManager.addStock(${item.id})">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn btn-outline-warning" onclick="assetsManager.removeStock(${item.id})">
                            <i class="fas fa-minus"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    updateInventoryStats() {
        const total = this.inventoryItems.length;
        const lowStock = this.inventoryItems.filter(i => i.current_quantity <= i.minimum_quantity).length;
        const outOfStock = this.inventoryItems.filter(i => i.current_quantity === 0).length;
        const totalValue = this.inventoryItems.reduce((sum, item) => 
            sum + (item.current_quantity * (item.unit_price || 0)), 0
        );

        document.getElementById('totalInventoryItems').textContent = total;
        document.getElementById('lowStockItems').textContent = lowStock;
        document.getElementById('outOfStockItems').textContent = outOfStock;
        document.getElementById('inventoryValue').textContent = totalValue.toFixed(2) + ' ريال';
    }

    // عرض تفاصيل الأصل
    async viewAsset(assetId) {
        try {
            const response = await fetch(`/api/assets/${assetId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const asset = await response.json();
                this.showAssetModal(asset);
            }
        } catch (error) {
            console.error('خطأ في عرض الأصل:', error);
        }
    }

    showAssetModal(asset) {
        const modalHtml = `
            <div class="modal fade" id="assetModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-${this.getAssetIcon(asset.category)} me-2"></i>
                                ${asset.name}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <p><strong>رقم الأصل:</strong> ${asset.asset_tag || 'غير محدد'}</p>
                                    <p><strong>الفئة:</strong> ${this.getAssetCategoryName(asset.category_id)}</p>
                                    <p><strong>الحالة:</strong> 
                                        <span class="badge bg-${this.getAssetStatusColor(asset.status)}">
                                            ${this.getAssetStatusText(asset.status)}
                                        </span>
                                    </p>
                                    <p><strong>الموقع:</strong> ${asset.location || 'غير محدد'}</p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>سعر الشراء:</strong> ${asset.purchase_price ? asset.purchase_price + ' ريال' : 'غير محدد'}</p>
                                    <p><strong>تاريخ الشراء:</strong> ${asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString('ar-SA') : 'غير محدد'}</p>
                                    <p><strong>فترة الضمان:</strong> ${asset.warranty_period || 'غير محدد'}</p>
                                    <p><strong>المورد:</strong> ${asset.supplier || 'غير محدد'}</p>
                                </div>
                            </div>
                            ${asset.description ? `
                                <hr>
                                <p><strong>الوصف:</strong></p>
                                <p>${asset.description}</p>
                            ` : ''}
                            ${asset.maintenance_records && asset.maintenance_records.length > 0 ? `
                                <hr>
                                <h6>سجل الصيانة:</h6>
                                <div class="table-responsive">
                                    <table class="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>التاريخ</th>
                                                <th>النوع</th>
                                                <th>الوصف</th>
                                                <th>التكلفة</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${asset.maintenance_records.map(record => `
                                                <tr>
                                                    <td>${new Date(record.maintenance_date).toLocaleDateString('ar-SA')}</td>
                                                    <td>${record.maintenance_type}</td>
                                                    <td>${record.description}</td>
                                                    <td>${record.cost || 0} ريال</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-warning" onclick="assetsManager.maintenanceAsset(${asset.id})">
                                <i class="fas fa-wrench me-2"></i>صيانة
                            </button>
                            <button type="button" class="btn btn-success" onclick="assetsManager.editAsset(${asset.id})">
                                <i class="fas fa-edit me-2"></i>تعديل
                            </button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('assetModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('assetModal'));
        modal.show();
    }

    // فلترة الأصول
    filterAssets() {
        const categoryFilter = document.getElementById('assetCategoryFilter').value;
        const statusFilter = document.getElementById('assetStatusFilter').value;
        const searchTerm = document.getElementById('assetSearch').value.toLowerCase();

        let filteredAssets = this.assets;

        if (categoryFilter) {
            filteredAssets = filteredAssets.filter(a => a.category_id == categoryFilter);
        }

        if (statusFilter) {
            filteredAssets = filteredAssets.filter(a => a.status === statusFilter);
        }

        if (searchTerm) {
            filteredAssets = filteredAssets.filter(a => 
                a.name.toLowerCase().includes(searchTerm) || 
                (a.asset_tag && a.asset_tag.toLowerCase().includes(searchTerm))
            );
        }

        const originalAssets = this.assets;
        this.assets = filteredAssets;
        this.renderAssets();
        this.assets = originalAssets;
    }

    // فلترة المخزون
    filterInventory() {
        const searchTerm = document.getElementById('inventorySearch').value.toLowerCase();
        const lowStockOnly = document.getElementById('lowStockFilter').checked;

        let filteredItems = this.inventoryItems;

        if (searchTerm) {
            filteredItems = filteredItems.filter(i => 
                i.name.toLowerCase().includes(searchTerm) || 
                (i.sku && i.sku.toLowerCase().includes(searchTerm))
            );
        }

        if (lowStockOnly) {
            filteredItems = filteredItems.filter(i => i.current_quantity <= i.minimum_quantity);
        }

        const originalItems = this.inventoryItems;
        this.inventoryItems = filteredItems;
        this.renderInventory();
        this.inventoryItems = originalItems;
    }

    editAsset(assetId) {
        console.log('تعديل الأصل:', assetId);
        // سيتم تنفيذه لاحقاً
    }

    maintenanceAsset(assetId) {
        console.log('صيانة الأصل:', assetId);
        // سيتم تنفيذه لاحقاً
    }

    viewInventoryItem(itemId) {
        console.log('عرض عنصر المخزون:', itemId);
        // سيتم تنفيذه لاحقاً
    }

    addStock(itemId) {
        console.log('إضافة مخزون:', itemId);
        // سيتم تنفيذه لاحقاً
    }

    removeStock(itemId) {
        console.log('إزالة مخزون:', itemId);
        // سيتم تنفيذه لاحقاً
    }
}

// إنشاء مثيل عام
const assetsManager = new AssetsManager();

// دوال مساعدة للتنقل
function showAssetsSection() {
    hideAllSections();
    document.getElementById('assets').style.display = 'block';
    assetsManager.loadAssets();
    assetsManager.loadAssetCategories();
}

function showInventorySection() {
    hideAllSections();
    document.getElementById('inventory').style.display = 'block';
    assetsManager.loadInventory();
}
