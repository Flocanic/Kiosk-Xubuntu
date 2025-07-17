let cart = [];
let products = [];
let totalAmount = 0;
let amount = '';
let sellerID = null;
let appliedVoucher = null;

function setSellerID() {
    const input = document.getElementById('seller-id-input');
    const value = parseInt(input.value);

    console.log('Seller ID:', value);

    if (value >= 1 && value <= 10) {
        sellerID = value;
        updateSellerInfo();
        document.getElementById('seller-modal').style.display = 'none';
    } else {
    	document.getElementById('seller-id-input').value = '';
        alert('Bitte gib eine gültige Verkäufer-ID zwischen 1 und 10 ein.');
    }
}

function updateSellerInfo() {
    const sellerIdDisplay = document.getElementById('seller-id-display');
    const logoutBtn = document.getElementById('logout-btn');

    if (sellerID) {
        sellerIdDisplay.textContent = `Aktuelle Verkäufer-ID: ${sellerID}`;
        logoutBtn.style.display = 'inline-block';
    } else {
        sellerIdDisplay.textContent = 'Aktuelle Verkäufer-ID: Nicht gesetzt';
        logoutBtn.style.display = 'none';
    }
}

function logout() {
    sellerID = null;
    updateSellerInfo();
    document.getElementById('seller-id-input').value = '';
    document.getElementById('seller-modal').style.display = 'flex';
}

window.addEventListener('DOMContentLoaded', () => {
    if (!sellerID) {
        document.getElementById('seller-modal').style.display = 'flex';
    }
    document.getElementById('cart-panel').style.display = 'block';
});

window.addEventListener('DOMContentLoaded', () => {
    if (!sellerID) {
        document.getElementById('seller-modal').style.display = 'flex';
    }
});

fetch('/products')
.then(response => response.json())
.then(data => {
    if (!data || data.length === 0) {
        console.error('Keine Produkte gefunden');
        return;
    }
    products = data;
    renderProducts();
})
.catch(error => {
    console.error('Fehler beim Laden der Produkte:', error);
});

function renderProducts() {
    const productsDiv = document.getElementById('products');
    productsDiv.innerHTML = '';
    
    products.forEach(product => {
        const productDiv = document.createElement('div');
        productDiv.classList.add('product');

        const imageContainer = document.createElement('div');
        imageContainer.style.width = '100%';
        imageContainer.style.height = '250px';
        imageContainer.style.backgroundColor = 'white';
        imageContainer.style.borderRadius = '8px';
        imageContainer.style.marginBottom = '10px';
        imageContainer.style.display = 'flex';
        imageContainer.style.justifyContent = 'center';
        imageContainer.style.alignItems = 'center';
        imageContainer.style.overflow = 'hidden';

        const img = document.createElement('img');
        img.src = `image/${product.id}.jpg`;
        img.alt = product.name;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        
        img.onerror = function() {
            this.style.display = 'none';
        };
        
        imageContainer.appendChild(img);
        
        productDiv.appendChild(imageContainer);
        productDiv.innerHTML += `
            <h2 id="product-name-${product.id}">${product.name}</h2>
            <p id="product-price-${product.id}">Preis: ${product.price.toFixed(2)}€</p>
            <p id="quantity-${product.id}">Verfügbare Menge: ${product.quantity}</p>
            <button id="addToBasket-${product.id}" ${product.quantity === 0 ? 'class="out-of-stock" disabled' : ''}>In den Warenkorb</button>
        `;
        productsDiv.appendChild(productDiv);

        document.getElementById(`addToBasket-${product.id}`).addEventListener('click', () => addToBasket(product));
    });
}

function addToBasket(product) {
    const productIndex = products.findIndex(p => p.id === product.id);
    if (products[productIndex].quantity > 0) {
        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({ ...product, quantity: 1 });
        }
        
        products[productIndex].quantity--;
        updateProductUI(product.id);
        updateCartUI();
        openCartPanel();
    }
}

function removeFromBasket(productId) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        const removedQuantity = item.quantity;
        cart = cart.filter(item => item.id !== productId);
        
        const productIndex = products.findIndex(p => p.id === productId);
        if (productIndex !== -1) {
            products[productIndex].quantity += removedQuantity;
            updateProductUI(productId);
        }
        
        updateCartUI();
    }
}

function updateProductUI(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        const quantityElement = document.getElementById(`quantity-${productId}`);
        const addButton = document.getElementById(`addToBasket-${productId}`);
        
        if (quantityElement) {
            quantityElement.textContent = `Verfügbare Menge: ${product.quantity}`;
        }
        
        if (addButton) {
            if (product.quantity === 0) {
                addButton.classList.add('out-of-stock');
                addButton.disabled = true;
            } else {
                addButton.classList.remove('out-of-stock');
                addButton.disabled = false;
            }
        }
    }
}

function updateCartUI() {
    const cartItemsDiv = document.getElementById('cart-items');
    cartItemsDiv.innerHTML = '';
    
    cart.forEach(item => {
        const cartItemDiv = document.createElement('div');
        cartItemDiv.classList.add('cart-item');
        cartItemDiv.innerHTML = `
            <p>${item.name} - ${item.quantity} x ${item.price}€</p>
            <button onclick="removeFromBasket(${item.id})">Entfernen</button>
        `;
        cartItemsDiv.appendChild(cartItemDiv);
    });

    totalAmount = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

    let voucherInfo = '';
    let finalAmount = totalAmount;
    
    if (appliedVoucher) {
        const discountAmount = Math.min(appliedVoucher.amount, totalAmount);
        finalAmount = totalAmount - discountAmount;
        
        voucherInfo = `
            <div class="voucher-info">
                <p>Gutschein: ${appliedVoucher.code}</p>
                <p>Rabatt: -${discountAmount.toFixed(2)}€</p>
                <button onclick="removeVoucher()">Gutschein entfernen</button>
            </div>
        `;
    }
    
    const voucherInput = !appliedVoucher ? `
        <div class="voucher-input">
            <input type="text" id="voucher-code-input" placeholder="Gutscheincode eingeben">
            <button onclick="applyVoucher()">Einlösen</button>
        </div>
    ` : '';
    
    cartItemsDiv.innerHTML += voucherInput + voucherInfo;
    
    document.getElementById('checkout-btn').textContent = `Kauf abschließen (${finalAmount.toFixed(2)}€)`;
}

function applyVoucher() {
    const codeInput = document.getElementById('voucher-code-input');
    const code = codeInput.value.trim();
    
    if (!code) {
        alert('Bitte gib einen Gutscheincode ein.');
        return;
    }
    
    fetch('/validate-voucher', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            appliedVoucher = {
                code: code,
                amount: data.amount
            };
            alert(`Gutschein im Wert von ${data.amount.toFixed(2)}€ wurde angewendet.`);
            updateCartUI();
        } else {
            alert(data.message || 'Ungültiger Gutscheincode.');
        }
    })
    .catch(error => {
        console.error('Fehler:', error);
        alert('Fehler beim Prüfen des Gutscheins.');
    });
}

function removeVoucher() {
    appliedVoucher = null;
    updateCartUI();
}

function openCartPanel() {
    document.getElementById('cart-panel').style.display = 'block';
}

function closeCartPanel() {
    document.getElementById('cart-panel').style.display = 'none';
}

function openPaymentWindow() {
    document.getElementById('payment-window').style.display = 'block';
}

function closePaymentWindow() {
    document.getElementById('payment-window').style.display = 'none';
}

function showChangeDisplay(change) {
    const changeDisplay = document.getElementById('final-change-display');
    changeDisplay.innerHTML = `Rückgeld: ${change}€`;
    document.getElementById('change-result').style.display = 'block';
}

function completePurchase() {
    if (cart.length === 0) return;

    if (!sellerID) {
        alert('Bitte gib eine Verkäufer-ID ein, bevor du den Kauf abschließt!');
        return;
    }

    fetch('/complete-purchase', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            cart, 
            sellerID,
            voucherCode: appliedVoucher ? appliedVoucher.code : null
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closeAllWindows();
            cart = [];
            appliedVoucher = null;
            updateCartUI();
            clearAmount();
            fetch('/products')
                .then(response => response.json())
                .then(data => {
                    products = data;
                    renderProducts();
                });
        } else {
            alert('Fehler beim Abschließen des Kaufs: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Fehler:', error);
        alert('Fehler beim Abschließen des Kaufs');
    });
}

function clearCart() {
    cart.forEach(item => {
        const productIndex = products.findIndex(p => p.id === item.id);
        if (productIndex !== -1) {
            products[productIndex].quantity += item.quantity;
            updateProductUI(item.id);
        }
    });
    
    cart = [];
    appliedVoucher = null;
    updateCartUI();
}

function clearAmount() {
    amount = '';
    document.getElementById('amount-input').textContent = '';
}

function closeAllWindows() {
    document.getElementById('change-result').style.display = 'none';
    document.getElementById('payment-window').style.display = 'none';
    document.getElementById('cart-panel').style.display = 'none';
}

let cartVisible = false;
/*
function shiftProducts(shift) {
    const productsDiv = document.getElementById('products');
    if (shift) {
        productsDiv.style.marginRight = '300px';
    } else {
        productsDiv.style.marginRight = '0';
    }
}
*/
function addAmount(value) {
    amount += value;
    document.getElementById('amount-input').textContent = amount;
}

document.getElementById('checkout-btn').addEventListener('click', openPaymentWindow);
document.getElementById('close-payment-btn').addEventListener('click', closePaymentWindow);
document.getElementById('close-change-result-btn').addEventListener('click', completePurchase);
document.getElementById('calculate-change-btn').addEventListener('click', () => {
    const inputAmount = parseFloat(amount);
    if (isNaN(inputAmount)) {
        alert('Bitte gib einen gültigen Betrag ein.');
        return;
    }
    
    let finalAmount = totalAmount;
    
    if (appliedVoucher) {
        const discountAmount = Math.min(appliedVoucher.amount, totalAmount);
        finalAmount = totalAmount - discountAmount;
    }
    
    if (inputAmount < finalAmount) {
        alert('Der eingegebene Betrag ist zu niedrig.');
        return;
    }
    
    const change = (inputAmount - finalAmount).toFixed(2);
    showChangeDisplay(change);
});
