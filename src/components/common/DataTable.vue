<template>
  <div class="data-table-wrapper">
    <!-- رأس الجدول -->
    <div class="table-header">
      <div class="header-left">
        <h3 class="table-title">{{ title }}</h3>
        <p v-if="subtitle" class="table-subtitle">{{ subtitle }}</p>
      </div>
      <div class="header-right">
        <div class="search-box" v-if="searchable">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ابحث..."
            class="search-input"
            @input="onSearch"
          />
          <span class="search-icon">🔍</span>
        </div>
        <slot name="actions"></slot>
      </div>
    </div>

    <!-- الجدول -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th v-if="selectable" class="col-checkbox">
              <input
                type="checkbox"
                :checked="allSelected"
                @change="toggleSelectAll"
                aria-label="تحديد الكل"
              />
            </th>
            <th
              v-for="column in columns"
              :key="column.key"
              class="table-header-cell"
              :class="{
                sortable: column.sortable,
                active: sortKey === column.key,
              }"
              @click="column.sortable && sort(column.key)"
            >
              <span class="header-content">
                {{ column.label }}
                <span
                  v-if="column.sortable && sortKey === column.key"
                  class="sort-icon"
                >
                  {{ sortOrder === 'asc' ? '↑' : '↓' }}
                </span>
              </span>
            </th>
            <th v-if="showActions" class="col-actions">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in paginatedData"
            :key="row.id || index"
            class="table-row"
            :class="{ selected: selectedRows.includes(row.id) }"
          >
            <td v-if="selectable" class="col-checkbox">
              <input
                type="checkbox"
                :checked="selectedRows.includes(row.id)"
                @change="toggleSelect(row.id)"
                :aria-label="`تحديد الصف ${index + 1}`"
              />
            </td>
            <td
              v-for="column in columns"
              :key="`${row.id}-${column.key}`"
              class="table-cell"
              :data-label="column.label"
            >
              <span v-if="column.render">
                {{ column.render(row[column.key], row) }}
              </span>
              <span v-else-if="column.type === 'badge'">
                <span class="badge" :class="`badge-${row[column.key]}`">
                  {{ row[column.key] }}
                </span>
              </span>
              <span v-else-if="column.type === 'progress'">
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    :style="{ width: `${row[column.key]}%` }"
                  ></div>
                  <span class="progress-text">{{ row[column.key] }}%</span>
                </div>
              </span>
              <span v-else>{{ row[column.key] }}</span>
            </td>
            <td v-if="showActions" class="col-actions">
              <div class="action-buttons">
                <button
                  v-for="action in actions"
                  :key="action.id"
                  :title="action.label"
                  :class="`btn-action btn-${action.type}`"
                  @click="action.handler(row)"
                >
                  {{ action.icon }}
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="filteredData.length === 0" class="no-data">
            <td :colspan="columnCount">
              <div class="no-data-message">
                <p>📭 لا توجد بيانات</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- تذييل الجدول -->
    <div v-if="paginated" class="table-footer">
      <div class="footer-info">
        <p>
          عرض
          <strong>{{ startIndex + 1 }}-{{ endIndex }}</strong>
          من <strong>{{ filteredData.length }}</strong>
        </p>
      </div>
      <div class="pagination">
        <button
          :disabled="currentPage === 1"
          @click="previousPage"
          class="btn-pagination"
        >
          ← السابق
        </button>
        <div class="page-info">
          الصفحة <strong>{{ currentPage }}</strong> من
          <strong>{{ totalPages }}</strong>
        </div>
        <button
          :disabled="currentPage === totalPages"
          @click="nextPage"
          class="btn-pagination"
        >
          التالي →
        </button>
      </div>
      <div class="rows-per-page">
        <label for="rows-select">صفوف لكل صفحة:</label>
        <select id="rows-select" v-model.number="itemsPerPage">
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DataTable',
  props: {
    title: {
      type: String,
      required: true,
    },
    subtitle: {
      type: String,
      default: null,
    },
    columns: {
      type: Array,
      required: true,
    },
    data: {
      type: Array,
      required: true,
    },
    actions: {
      type: Array,
      default: () => [],
    },
    paginated: {
      type: Boolean,
      default: true,
    },
    itemsPerPageDefault: {
      type: Number,
      default: 10,
    },
    searchable: {
      type: Boolean,
      default: true,
    },
    selectable: {
      type: Boolean,
      default: true,
    },
    showActions: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['row-click', 'selection-change', 'search'],
  data() {
    return {
      searchQuery: '',
      currentPage: 1,
      itemsPerPage: this.itemsPerPageDefault,
      sortKey: null,
      sortOrder: 'asc',
      selectedRows: [],
    }
  },
  computed: {
    filteredData() {
      if (!this.searchQuery) return this.data

      const query = this.searchQuery.toLowerCase()
      return this.data.filter(row =>
        this.columns.some(col => {
          const value = row[col.key]
          return value && String(value).toLowerCase().includes(query)
        })
      )
    },

    sortedData() {
      if (!this.sortKey) return this.filteredData

      return [...this.filteredData].sort((a, b) => {
        const aVal = a[this.sortKey]
        const bVal = b[this.sortKey]

        if (aVal < bVal) return this.sortOrder === 'asc' ? -1 : 1
        if (aVal > bVal) return this.sortOrder === 'asc' ? 1 : -1
        return 0
      })
    },

    paginatedData() {
      if (!this.paginated) return this.sortedData
      return this.sortedData.slice(this.startIndex, this.endIndex)
    },

    totalPages() {
      return Math.ceil(this.sortedData.length / this.itemsPerPage)
    },

    startIndex() {
      return (this.currentPage - 1) * this.itemsPerPage
    },

    endIndex() {
      return this.startIndex + this.itemsPerPage
    },

    allSelected() {
      if (this.paginatedData.length === 0) return false
      return this.paginatedData.every(row => this.selectedRows.includes(row.id))
    },

    columnCount() {
      let count = this.columns.length
      if (this.selectable) count += 1
      if (this.showActions) count += 1
      return count
    },
  },

  methods: {
    onSearch() {
      this.currentPage = 1
      this.$emit('search', this.searchQuery)
    },

    sort(key) {
      if (this.sortKey === key) {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortKey = key
        this.sortOrder = 'asc'
      }
    },

    toggleSelect(id) {
      const index = this.selectedRows.indexOf(id)
      if (index > -1) {
        this.selectedRows.splice(index, 1)
      } else {
        this.selectedRows.push(id)
      }
      this.$emit('selection-change', this.selectedRows)
    },

    toggleSelectAll() {
      if (this.allSelected) {
        this.selectedRows = this.selectedRows.filter(
          id => !this.paginatedData.some(row => row.id === id)
        )
      } else {
        this.paginatedData.forEach(row => {
          if (!this.selectedRows.includes(row.id)) {
            this.selectedRows.push(row.id)
          }
        })
      }
      this.$emit('selection-change', this.selectedRows)
    },

    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage += 1
      }
    },

    previousPage() {
      if (this.currentPage > 1) {
        this.currentPage -= 1
      }
    },
  },
}
</script>

<style scoped>
.data-table-wrapper {
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-gray-200);
  flex-wrap: wrap;
}

.header-left {
  flex: 1;
  min-width: 200px;
}

.table-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-gray-800);
}

.table-subtitle {
  margin: var(--spacing-xs) 0 0 0;
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.search-box {
  position: relative;
  min-width: 250px;
}

.search-input {
  width: 100%;
  padding: var(--spacing-md) var(--spacing-lg);
  padding-right: 40px;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary-600);
  box-shadow: 0 0 0 3px var(--color-primary-50);
}

.search-icon {
  position: absolute;
  right: var(--spacing-lg);
  top: 50%;
  transform: translateY(-50%);
}

.table-container {
  overflow-x: auto;
  flex: 1;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.table-header-cell {
  padding: var(--spacing-lg);
  background: var(--color-gray-50);
  border-bottom: 2px solid var(--color-gray-200);
  font-weight: 700;
  color: var(--color-gray-700);
  text-align: right;
  cursor: default;
  user-select: none;
}

.table-header-cell.sortable {
  cursor: pointer;
  transition: all var(--transition-base);
}

.table-header-cell.sortable:hover {
  background: var(--color-gray-100);
  color: var(--color-primary-600);
}

.header-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.sort-icon {
  font-size: var(--text-xs);
  font-weight: 700;
}

.table-row {
  border-bottom: 1px solid var(--color-gray-200);
  transition: all var(--transition-base);
}

.table-row:hover {
  background: var(--color-gray-50);
}

.table-row.selected {
  background: var(--color-primary-50);
}

.table-cell {
  padding: var(--spacing-lg);
  color: var(--color-gray-800);
}

.col-checkbox {
  width: 50px;
  text-align: center;
}

.col-actions {
  width: 100px;
  text-align: center;
}

.action-buttons {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: center;
}

.btn-action {
  padding: var(--spacing-sm);
  background: transparent;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-base);
  transition: all var(--transition-base);
}

.btn-action:hover {
  background: var(--color-gray-100);
  border-color: var(--color-gray-300);
}

.btn-action.btn-edit:hover {
  color: var(--color-primary-600);
}

.btn-action.btn-delete:hover {
  color: var(--color-error-600);
}

.badge {
  display: inline-block;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
}

.badge-active {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

.badge-completed {
  background: var(--color-primary-100);
  color: var(--color-primary-700);
}

.badge-pending {
  background: var(--color-warning-100);
  color: var(--color-warning-700);
}

.progress-bar {
  position: relative;
  height: 24px;
  background: var(--color-gray-100);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--color-primary-600),
    var(--color-primary-400)
  );
  transition: width var(--transition-base);
}

.progress-text {
  position: absolute;
  top: 50%;
  right: var(--spacing-sm);
  transform: translateY(-50%);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-gray-700);
}

.no-data {
  border-bottom: none;
}

.no-data-message {
  padding: var(--spacing-3xl) var(--spacing-lg);
  text-align: center;
  color: var(--color-gray-500);
}

.no-data-message p {
  margin: 0;
  font-size: var(--text-lg);
}

.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  border-top: 1px solid var(--color-gray-200);
  background: var(--color-gray-50);
  flex-wrap: wrap;
}

.footer-info p {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-gray-600);
}

.pagination {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.page-info {
  font-size: var(--text-sm);
  color: var(--color-gray-600);
  white-space: nowrap;
}

.btn-pagination {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-white);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--color-gray-700);
  transition: all var(--transition-base);
}

.btn-pagination:hover:not(:disabled) {
  background: var(--color-primary-600);
  border-color: var(--color-primary-600);
  color: white;
}

.btn-pagination:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.rows-per-page {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-sm);
  color: var(--color-gray-600);
}

.rows-per-page select {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  background: var(--color-white);
  cursor: pointer;
}

@media (max-width: 768px) {
  .table-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-right {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    min-width: auto;
  }

  .table-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .table-cell {
    padding: var(--spacing-md);
    font-size: var(--text-xs);
  }

  .table-cell::before {
    content: attr(data-label);
    display: block;
    font-weight: 600;
    margin-bottom: var(--spacing-xs);
    color: var(--color-gray-500);
  }
}
</style>
