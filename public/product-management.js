let clickCounter = 0;
let debugModeActive = false;
let clickTimer;

function setupDebugFeature() {
    const dailyReportBtn = document.getElementById('get-daily-report-btn');
    const monthlyReportBtn = document.getElementById('get-monthly-report-btn');

    dailyReportBtn.addEventListener('click', handleDebugClick);
    monthlyReportBtn.addEventListener('click', handleDebugClick);
}

function loadTransactionsForDebug() {
    fetch('/transactions')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const transactionSelects = document.querySelectorAll('[id^="transaction-id-select-"]');
                transactionSelects.forEach(transactionSelect => {

                    transactionSelect.innerHTML = '';

                    const defaultOption = document.createElement('option');
                    defaultOption.value = '';
                    defaultOption.textContent = '-- Transaktion auswählen --';
                    transactionSelect.appendChild(defaultOption);

                    data.transactions.forEach(transaction => {
                        const option = document.createElement('option');
                        option.value = transaction.transaction_id;
                        option.textContent = `Transaktion ID: ${transaction.transaction_id} - ${transaction.date}`;
                        transactionSelect.appendChild(option);
                    });
                });
            } else {
                console.error('Fehler beim Laden der Transaktionen:', data.message);
            }
        })
        .catch(error => {
            console.error('Fehler:', error);
        });
}

function handleDebugClick() {
    clickCounter++;

    clearTimeout(clickTimer);
    
    clickTimer = setTimeout(() => {
        if (clickCounter >= 3) {
            toggleDebugMode();
        }
        clickCounter = 0;
    }, 500);
}

function toggleDebugMode() {
    debugModeActive = !debugModeActive;
    
    if (debugModeActive) {
        createDeleteTransactionUI();
        alert("Debug-Modus aktiviert");
    } else {
        removeDeleteTransactionUI();
        alert("Debug deaktiviert");
    }
}

function createDeleteTransactionUI() {
    removeDeleteTransactionUI();

    createDebugSection('daily-report-results');
    createDebugSection('monthly-report-results');

    loadTransactionsForDebug();
}

function createDebugSection(parentId) {
    const parentElement = document.getElementById(parentId);
    if (!parentElement) return;
    
    const debugSection = document.createElement('div');
    debugSection.id = `debug-section-${parentId}`;
    debugSection.className = 'debug-section';
    debugSection.style.marginTop = '20px';
    debugSection.style.padding = '15px';
    debugSection.style.border = '1px solid red';
    debugSection.style.borderRadius = '5px';
    
    const heading = document.createElement('h4');
    heading.textContent = 'Debug-Modus: Transaktionen verwalten';
    heading.style.color = 'red';
    
    const transactionSelectLabel = document.createElement('label');
    transactionSelectLabel.textContent = 'Transaktions-ID auswählen:';
    transactionSelectLabel.style.marginRight = '10px';
    
    const transactionSelect = document.createElement('select');
    transactionSelect.id = `transaction-id-select-${parentId}`;
    transactionSelect.style.marginRight = '10px';
    transactionSelect.style.padding = '8px';
    
    const deleteButton = document.createElement('button');
    deleteButton.id = `delete-transaction-${parentId}`;
    deleteButton.textContent = 'Transaktion löschen';
    deleteButton.style.backgroundColor = '#ff4d4d';
    deleteButton.style.color = 'white';
    deleteButton.style.padding = '8px 12px';
    deleteButton.style.border = 'none';
    deleteButton.style.borderRadius = '4px';
    deleteButton.style.cursor = 'pointer';

    deleteButton.addEventListener('click', function() {
        const transactionId = document.getElementById(`transaction-id-select-${parentId}`).value;
        if (transactionId) {
            deleteTransaction(transactionId);
        } else {
            alert('Bitte eine Transaktions-ID auswählen');
        }
    });
    
    debugSection.appendChild(heading);
    debugSection.appendChild(transactionSelectLabel);
    debugSection.appendChild(transactionSelect);
    debugSection.appendChild(deleteButton);
    
    parentElement.appendChild(debugSection);
}

function removeDeleteTransactionUI() {
    const debugSections = document.querySelectorAll('.debug-section');
    debugSections.forEach(section => section.remove());
}

function deleteTransaction(transactionId) {
    fetch(`/delete-transaction/${transactionId}`, {
        method: 'DELETE',
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert(`Transaktion ${transactionId} erfolgreich gelöscht`);
            
            if (document.getElementById('daily-report-results').style.display === 'block') {
                getDailyReport();
            }
            if (document.getElementById('monthly-report-results').style.display === 'block') {
                getMonthlyReport();
            }

            loadTransactionsForDebug();
        } else {
            alert('Fehler beim Löschen der Transaktion: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Fehler:', error);
        alert('Fehler beim Löschen der Transaktion');
    });
}

function displayDailyReport(data) {
    const resultsDiv = document.getElementById('daily-report-results');
    resultsDiv.style.display = 'block';
    
    let html = `<h4>Tagesumsatz für ${data.date}</h4>`;
    
    if (data.sales.length === 0) {
        html += '<p>Keine Verkäufe an diesem Tag</p>';
    } else {
        html += `
            <h5>Produktzusammenfassung</h5>
            <table class="product-table">
                <thead>
                    <tr>
                        <th>Produkt ID</th>
                        <th>Produktname</th>
                        <th>Verkaufte Menge</th>
                        <th>Umsatz (€)</th>
                        <th>Verkäufer ID</th>   

                    </tr>
                </thead>
                <tbody>
        `;
        
        data.sales.forEach(sale => {
            html += `
                <tr>
                    <td>${sale.id}</td>
                    <td>${sale.name}</td>
                    <td>${sale.total_quantity}</td>
                    <td>${sale.total_sales.toFixed(2)}</td>
                    <td>${sale.sellerID || 'N/A'}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3"><strong>Gesamtumsatz</strong></td>
                        <td><strong>${data.totalSales.toFixed(2)}€</strong></td>
                        <td colspan="2"></td>
                    </tr>
                </tfoot>
            </table>
        `;

        if (data.transactions && data.transactions.length > 0) {
            html += `
                <h5>Transaktionsdetails</h5>
                <table class="product-table">
                    <thead>
                        <tr>
                            <th>Trans. ID</th>
                            
                            <th>Produkt ID</th>
                            <th>Produktname</th>
                            <th>Menge</th>
                            <th>Einzelpreis (€)</th>
                            <th>Gesamt (€)</th>
                            <th>Datum</th>
                            <th>Verkäufer ID</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            data.transactions.forEach(transaction => {
                html += `
                    <tr>
                        <td>${transaction.transaction_id}</td>
                        
                        <td>${transaction.product_id}</td>
                        <td>${transaction.product_name || 'N/A'}</td>
                        <td>${transaction.quantity}</td>
                        <td>${(transaction.unit_price || transaction.price).toFixed(2)}</td>
                        <td>${transaction.total.toFixed(2)}</td>
                        <td>${transaction.date}</td>
                        <td>${transaction.sellerID || 'N/A'}</td>
                    </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
            `;
        }
    }
    
    resultsDiv.innerHTML = html;

    if (debugModeActive) {
        createDebugSection('daily-report-results');
        loadTransactionsForDebug();
    }
}

function deleteProduct(id) {
    if (confirm('Möchten Sie dieses Produkt wirklich löschen?')) {
        fetch(`/delete-product/${id}`, {
            method: 'DELETE',
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                alert('Produkt erfolgreich gelöscht');
                loadProducts();
            } else {
                alert('Fehler beim Löschen des Produkts: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Fehler:', error);
            alert('Fehler beim Löschen des Produkts');
        });
    }
}

function getMonthlyReport() {
    const month = document.getElementById('monthly-report-month').value;
    const year = document.getElementById('monthly-report-year').value;
    
    fetch(`/reports/monthly?month=${month}&year=${year}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                displayMonthlyReport(data);
            } else {
                alert('Fehler beim Laden des Monatsberichts: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Fehler:', error);
            alert('Fehler beim Laden des Monatsberichts');
        });
}

function displayMonthlyReport(data) {
    const resultsDiv = document.getElementById('monthly-report-results');
    resultsDiv.style.display = 'block';
    
    const monthNames = [
        'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    const monthName = monthNames[parseInt(data.month) - 1];
    
    let html = `<h4>Monatsumsatz für ${monthName} ${data.year}</h4>`;
    
    if (data.sales.length === 0) {
        html += '<p>Keine Verkäufe in diesem Monat</p>';
    } else {
        html += `
            <table class="product-table">
                <thead>
                    <tr>
                        <th>Datum</th>
                        <th>Tagesumsatz (€)</th>
                        <th>Verkäufer IDs</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.sales.forEach(sale => {
            html += `
                <tr>
                    <td>${sale.date}</td>
                    <td>${sale.daily_total.toFixed(2)}</td>
                    <td>${sale.sellerIDs || 'N/A'}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
                <tfoot>
                    <tr>
                        <td><strong>Monatsumsatz</strong></td>
                        <td><strong>${data.totalSales.toFixed(2)}€</strong></td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        `;
    }
    
    resultsDiv.innerHTML = html;
    
    if (debugModeActive) {
        createDebugSection('monthly-report-results');
        loadTransactionsForDebug();
    }
}

function setupTabNavigation() {
    const tabs = document.querySelectorAll('.tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => content.classList.remove('active'));
            
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
}

function setupEventListeners() {
    document.getElementById('add-product-btn').addEventListener('click', addProduct);
    document.getElementById('update-product-btn').addEventListener('click', updateProduct);
    document.getElementById('cancel-edit-btn').addEventListener('click', cancelEdit);
    document.getElementById('get-daily-report-btn').addEventListener('click', getDailyReport);
    document.getElementById('get-monthly-report-btn').addEventListener('click', getMonthlyReport);
}

function loadProducts() {
    fetch('/products')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(products => {
            const productList = document.getElementById('product-list');
            productList.innerHTML = '';
            
            products.forEach(product => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${product.id}</td>
                    <td>${product.name}</td>
                    <td>${product.price.toFixed(2)}</td>
                    <td>${product.quantity}</td>
                    <td>
                        <button onclick="editProduct(${product.id}, '${product.name}', ${product.price}, ${product.quantity})">Bearbeiten</button>
                        <button onclick="deleteProduct(${product.id})">Löschen</button>
                    </td>
                `;
                productList.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Fehler beim Laden der Produkte:', error);
            alert('Fehler beim Laden der Produkte');
        });
}

function addProduct() {
    const name = document.getElementById('product-name').value;
    const price = parseFloat(document.getElementById('product-price').value);
    const quantity = parseInt(document.getElementById('product-quantity').value);
    
    if (!name || isNaN(price) || isNaN(quantity)) {
        alert('Bitte füllen Sie alle Felder korrekt aus');
        return;
    }
    
    fetch('/add-product', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, price, quantity }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert('Produkt erfolgreich hinzugefügt');
            document.getElementById('product-name').value = '';
            document.getElementById('product-price').value = '';
            document.getElementById('product-quantity').value = '';
            loadProducts();
        } else {
            alert('Fehler beim Hinzufügen des Produkts: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Fehler:', error);
        alert('Fehler beim Hinzufügen des Produkts');
    });
}

function editProduct(id, name, price, quantity) {
    document.getElementById('edit-product-id').value = id;
    document.getElementById('edit-product-name').value = name;
    document.getElementById('edit-product-price').value = price;
    document.getElementById('edit-product-quantity').value = quantity;
    document.getElementById('edit-form').style.display = 'block';
}

function updateProduct() {
    const id = document.getElementById('edit-product-id').value;
    const name = document.getElementById('edit-product-name').value;
    const price = parseFloat(document.getElementById('edit-product-price').value);
    const quantity = parseInt(document.getElementById('edit-product-quantity').value);
    
    if (!name || isNaN(price) || isNaN(quantity)) {
        alert('Bitte füllen Sie alle Felder korrekt aus');
        return;
    }
    
    fetch(`/update-product/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, price, quantity }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert('Produkt erfolgreich aktualisiert');
            document.getElementById('edit-form').style.display = 'none';
            loadProducts();
        } else {
            alert('Fehler beim Aktualisieren des Produkts: ' + data.message);
        }
    })  
        
        .catch(error => {
        console.error('Fehler:', error);
        alert('Fehler beim Aktualisieren des Produkts');
    });
}

function cancelEdit() {
    document.getElementById('edit-form').style.display = 'none';
}

function getDailyReport() {
    const date = document.getElementById('daily-report-date').value;
    
    fetch(`/reports/daily?date=${date}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                displayDailyReport(data);
            } else {
                alert('Fehler beim Laden des Tagesberichts: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Fehler:', error);
            alert('Fehler beim Laden des Tagesberichts');
        });
}

document.addEventListener('DOMContentLoaded', function() {
    setupTabNavigation();
    loadProducts();
    setupEventListeners();
    setupDebugFeature();

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('daily-report-date').value = today;
    
    const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const currentYear = new Date().getFullYear().toString();
    document.getElementById('monthly-report-month').value = currentMonth;
    document.getElementById('monthly-report-year').value = currentYear;
});
