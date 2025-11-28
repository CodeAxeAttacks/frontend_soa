// Конфигурация API
const API_CONFIG = {
    service1: 'https://localhost:8081/api/v1/organizations',
    service2: 'https://localhost:8082/orgmanager'
};

// Состояние приложения
let currentPage = 0;
let pageSize = 10;
let totalPages = 0;
let currentOrg = null;

// Переключение вкладок
function showTab(tabName) {
    // Скрыть все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    // Показать выбранную вкладку
    document.getElementById(`${tabName}-tab`).classList.add('active');
    event.target.classList.add('active');

    // Загрузить данные для вкладки "Список"
    if (tabName === 'list') {
        loadOrganizations();
    }
}

// Показать уведомление
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;

    setTimeout(() => {
        notification.classList.add('hidden');
    }, 5000);
}

// Показать/скрыть загрузку
function setLoading(loading) {
    document.getElementById('loading').classList.toggle('hidden', !loading);
}

// Загрузить список организаций
async function loadOrganizations() {
    setLoading(true);

    try {
        // Собрать параметры фильтрации
        const params = new URLSearchParams();
        params.append('page', currentPage);
        params.append('size', pageSize);

        // Сортировка
        const sortField = document.getElementById('sort-field').value;
        const sortDir = document.getElementById('sort-direction').value;
        params.append('sort', `${sortField},${sortDir}`);

        // Фильтры
        const name = document.getElementById('filter-name').value;
        if (name) params.append('name', name);

        const type = document.getElementById('filter-type').value;
        if (type) params.append('type', type);

        const minEmp = document.getElementById('filter-employees-min').value;
        if (minEmp) params.append('employeesCountMin', minEmp);

        const maxEmp = document.getElementById('filter-employees-max').value;
        if (maxEmp) params.append('employeesCountMax', maxEmp);

        const response = await fetch(`${API_CONFIG.service1}?${params}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        displayOrganizations(data);
        updatePagination(data);

    } catch (error) {
        showNotification(`Ошибка загрузки: ${error.message}`, 'error');
        console.error(error);
    } finally {
        setLoading(false);
    }
}

// Отобразить организации в таблице
function displayOrganizations(data) {
    const container = document.getElementById('organizations-table');

    if (data.content.length === 0) {
        container.innerHTML = '<p class="text-muted">Организации не найдены</p>';
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Название</th>
                    <th>Тип</th>
                    <th>Сотрудники</th>
                    <th>Оборот</th>
                    <th>Адрес</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.content.forEach(org => {
        html += `
            <tr>
                <td>${org.id}</td>
                <td><strong>${org.name}</strong></td>
                <td>${formatType(org.type)}</td>
                <td>${org.employeesCount}</td>
                <td>${formatMoney(org.annualTurnover)}</td>
                <td>${org.officialAddress.street}</td>
                <td class="actions">
                    <button class="btn btn-small btn-primary" onclick="viewDetails(${org.id})">👁️ Детали</button>
                    <button class="btn btn-small btn-danger" onclick="deleteOrganization(event, ${org.id})">🗑️</button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

// Просмотр деталей организации
async function viewDetails(id) {
    try {
        const response = await fetch(`${API_CONFIG.service1}/${id}`);
        if (!response.ok) throw new Error('Организация не найдена');

        const org = await response.json();

        const html = `
            <div class="org-details">
                <h3>Детали организации #${org.id}</h3>
                <div class="org-details-grid">
                    <div class="detail-item">
                        <div class="detail-label">Название</div>
                        <div class="detail-value">${org.name}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Полное название</div>
                        <div class="detail-value">${org.fullName || 'Не указано'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Тип</div>
                        <div class="detail-value">${formatType(org.type)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Количество сотрудников</div>
                        <div class="detail-value">${org.employeesCount}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Годовой оборот</div>
                        <div class="detail-value">${formatMoney(org.annualTurnover)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Координаты</div>
                        <div class="detail-value">X: ${org.coordinates.x}, Y: ${org.coordinates.y}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Адрес</div>
                        <div class="detail-value">${org.officialAddress.street}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Дата создания</div>
                        <div class="detail-value">${formatDate(org.creationDate)}</div>
                    </div>
                </div>
            </div>
        `;

        const container = document.getElementById('organizations-table');
        container.insertAdjacentHTML('afterbegin', html);

    } catch (error) {
        showNotification(`Ошибка: ${error.message}`, 'error');
    }
}

// Обновить пагинацию
function updatePagination(data) {
    currentPage = data.page;
    totalPages = data.totalPages;

    document.getElementById('page-info').textContent =
        `Страница ${currentPage + 1} из ${totalPages} (всего: ${data.totalElements})`;

    document.getElementById('prev-btn').disabled = currentPage === 0;
    document.getElementById('next-btn').disabled = currentPage >= totalPages - 1;
}

// Следующая страница
function nextPage() {
    if (currentPage < totalPages - 1) {
        currentPage++;
        loadOrganizations();
    }
}

// Предыдущая страница
function previousPage() {
    if (currentPage > 0) {
        currentPage--;
        loadOrganizations();
    }
}

// Очистить фильтры
function clearFilters() {
    document.getElementById('filter-name').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-employees-min').value = '';
    document.getElementById('filter-employees-max').value = '';
    currentPage = 0;
    loadOrganizations();
}

// Создать организацию
async function createOrganization(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    const organization = {
        name: formData.get('name'),
        coordinates: {
            x: parseFloat(formData.get('coordinatesX')),
            y: parseInt(formData.get('coordinatesY'))
        },
        fullName: formData.get('fullName') || null,
        employeesCount: parseInt(formData.get('employeesCount')),
        annualTurnover: formData.get('annualTurnover') ? parseFloat(formData.get('annualTurnover')) : null,
        type: formData.get('type'),
        officialAddress: {
            street: formData.get('street')
        }
    };

    try {
        const response = await fetch(API_CONFIG.service1, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(organization)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка создания');
        }

        showNotification('✅ Организация успешно создана!', 'success');
        form.reset();
        showTab('list');
        loadOrganizations();

    } catch (error) {
        showNotification(`❌ Ошибка: ${error.message}`, 'error');
    }
}

// Объединить организации
async function mergeOrganizations(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    const id1 = formData.get('id1');
    const id2 = formData.get('id2');
    const newName = formData.get('newName');
    const newAddress = formData.get('newAddress');

    try {
        const response = await fetch(
            `${API_CONFIG.service2}/merge/${id1}/${id2}/${encodeURIComponent(newName)}/${encodeURIComponent(newAddress)}`,
            { method: 'POST' }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка объединения');
        }

        const result = await response.json();
        showNotification(`✅ Организации объединены! Новый ID: ${result.id}`, 'success');
        form.reset();

    } catch (error) {
        showNotification(`❌ Ошибка: ${error.message}`, 'error');
    }
}

// Нанять сотрудника
async function hireEmployee(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const id = formData.get('id');

    try {
        const response = await fetch(`${API_CONFIG.service2}/hire/${id}`, {
            method: 'POST'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка найма');
        }

        const result = await response.json();
        showNotification(`✅ Сотрудник нанят! Новое количество: ${result.employeesCount}`, 'success');
        form.reset();

    } catch (error) {
        showNotification(`❌ Ошибка: ${error.message}`, 'error');
    }
}

// Удалить организацию
async function deleteOrganization(event, id) {
    if (event && event.preventDefault) {
        event.preventDefault();
    }

    // Если вызвано из формы
    if (!id) {
        const form = event.target;
        const formData = new FormData(form);
        id = formData.get('id');
    }

    if (!confirm(`Вы уверены, что хотите удалить организацию #${id}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_CONFIG.service1}/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка удаления');
        }

        showNotification('✅ Организация удалена!', 'success');
        loadOrganizations();

    } catch (error) {
        showNotification(`❌ Ошибка: ${error.message}`, 'error');
    }
}

// Удалить по полному имени
async function deleteByFullName(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const fullName = formData.get('fullName');

    if (!confirm(`Удалить все организации с полным именем "${fullName}"?`)) {
        return;
    }

    try {
        const response = await fetch(
            `${API_CONFIG.service1}/by-full-name/${encodeURIComponent(fullName)}`,
            { method: 'DELETE' }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка удаления');
        }

        const result = await response.json();
        showNotification(`✅ Удалено организаций: ${result.deletedCount}`, 'success');
        form.reset();
        loadOrganizations();

    } catch (error) {
        showNotification(`❌ Ошибка: ${error.message}`, 'error');
    }
}

// Загрузить статистику
async function loadStatistics() {
    try {
        // Средний оборот
        const avgResponse = await fetch(`${API_CONFIG.service1}/average-turnover`);
        const avgData = await avgResponse.json();

        // Подсчёт по типам
        const publicResponse = await fetch(`${API_CONFIG.service1}/count-by-type-greater/PUBLIC`);
        const publicData = await publicResponse.json();

        const trustResponse = await fetch(`${API_CONFIG.service1}/count-by-type-greater/TRUST`);
        const trustData = await trustResponse.json();

        // Общее количество
        const allResponse = await fetch(`${API_CONFIG.service1}?page=0&size=1`);
        const allData = await allResponse.json();

        const html = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Всего организаций</h3>
                    <div class="stat-value">${allData.totalElements}</div>
                </div>
                <div class="stat-card">
                    <h3>Средний оборот</h3>
                    <div class="stat-value">${formatMoney(avgData.averageAnnualTurnover)}</div>
                    <p style="margin-top: 10px; font-size: 0.9em;">Из ${avgData.count} организаций</p>
                </div>
                <div class="stat-card">
                    <h3>Типов больше PUBLIC</h3>
                    <div class="stat-value">${publicData.count}</div>
                    <p style="margin-top: 10px; font-size: 0.9em;">TRUST + PRIVATE</p>
                </div>
                <div class="stat-card">
                    <h3>Типов больше TRUST</h3>
                    <div class="stat-value">${trustData.count}</div>
                    <p style="margin-top: 10px; font-size: 0.9em;">PRIVATE LIMITED</p>
                </div>
            </div>
        `;

        document.getElementById('statistics-content').innerHTML = html;

    } catch (error) {
        showNotification(`Ошибка загрузки статистики: ${error.message}`, 'error');
    }
}

// Форматирование
function formatType(type) {
    const types = {
        'PUBLIC': 'Публичная',
        'TRUST': 'Траст',
        'PRIVATE_LIMITED_COMPANY': 'Частная ООО'
    };
    return types[type] || type;
}

function formatMoney(amount) {
    if (!amount) return 'Не указано';
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB'
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleString('ru-RU');
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadOrganizations();
});