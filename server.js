const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

const db = new sqlite3.Database('./shop.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Fehler beim öffnen der Datenbank:', err.message);
        return;
    }
    console.log('Mit SQLite-Datenbank verbunden.');
    
    db.serialize(() => {
        db.run('CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price REAL, quantity INTEGER)');
        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id TEXT,
            product_id INTEGER,
            quantity INTEGER,
            unit_price REAL,
            total REAL,
            date TEXT,
            payment_id TEXT,
            sellerID INTEGER,
            name TEXT,
            FOREIGN KEY (product_id) REFERENCES products (id)
        )`);
    });
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/transactions', (req, res) => {
    db.all('SELECT * FROM transactions ORDER BY date DESC', (err, rows) => {
        if (err) {
            console.error('Fehler beim Abrufen der Transaktionen:', err);
            return res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Transaktionen' });
        }
        res.json({ success: true, transactions: rows });
    });
});

app.get('/products', (req, res) => {
    db.all('SELECT * FROM products', (err, rows) => {
        if (err) {
            console.error('Fehler beim Abrufen der Produkte:', err);
            return res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Produkte' });
        }
        res.json(rows);
    });
});

app.delete('/delete-transaction/:id', (req, res) => {
    const transactionId = req.params.id;
    
    db.run('DELETE FROM transactions WHERE transaction_id = ?', [transactionId], function(err) {
        if (err) {
            console.error('Fehler beim Löschen der Transaktion:', err);
            return res.status(500).json({ success: false, message: 'Fehler beim Löschen der Transaktion' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Transaktion nicht gefunden' });
        }

        res.json({ success: true, message: 'Transaktion erfolgreich gelöscht' });
    });
});
app.post('/complete-purchase', (req, res) => {
    const { cart, sellerID } = req.body;

    if (!sellerID || sellerID < 1 || sellerID > 10) {
        return res.status(400).json({ success: false, message: 'Ungültige Verkäufer-ID' });
    }

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
        return res.status(400).json({ success: false, message: 'Ungültiger Warenkorb' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        let allSuccess = true;
        let completed = 0;
        const transactionId = Date.now().toString();

        cart.forEach(item => {
            const { id, quantity, name, price } = item;
            const total = quantity * price;

            db.run(`INSERT INTO transactions 
                (transaction_id, product_id, quantity, unit_price, total, date, payment_id, sellerID, name) 
                VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?, ?)`,
                [transactionId, id, quantity, price, total, "bar", sellerID, name],
                function (err) {
                    if (err) {
                        console.error("Fehler beim Einfügen in transactions:", err);
                        allSuccess = false;
                    }

                    db.run(`UPDATE products SET quantity = quantity - ? WHERE id = ?`, [quantity, id], function (err2) {
                        if (err2) {
                            console.error("Fehler beim Aktualisieren der Produkte:", err2);
                            allSuccess = false;
                        }

                        completed++;
                        if (completed === cart.length) {
                            if (allSuccess) {
                                db.run('COMMIT');
                                return res.json({ success: true, message: 'Kauf abgeschlossen' });
                            } else {
                                db.run('ROLLBACK');
                                return res.status(500).json({ success: false, message: 'Fehler beim Verarbeiten der Transaktion' });
                            }
                        }
                    });
                });
        });
    });
});



app.delete('/delete-product/:id', (req, res) => {
    const productId = req.params.id;

    db.run('DELETE FROM products WHERE id = ?', [productId], function(err) {
        if (err) {
            console.error('Fehler beim Löschen des Produkts:', err);
            return res.status(500).json({ success: false, message: 'Fehler beim Löschen des Produkts' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Produkt nicht gefunden' });
        }

        res.json({ success: true, message: 'Produkt erfolgreich gelöscht' });
    });
});

app.post('/add-product', (req, res) => {
    const { name, price, quantity } = req.body;
    
    if (!name || isNaN(price) || isNaN(quantity)) {
        return res.status(400).json({ success: false, message: 'Ungültige Produktdaten' });
    }
    
    db.run(
        'INSERT INTO products (name, price, quantity) VALUES (?, ?, ?)',
        [name, price, quantity],
        function(err) {
            if (err) {
                console.error('Fehler beim Hinzufügen des Produkts:', err);
                return res.status(500).json({ success: false, message: 'Fehler beim Hinzufügen des Produkts' });
            }
            
            res.json({ success: true, message: 'Produkt erfolgreich', productId: this.lastID });
        }
    );
});

app.put('/update-product/:id', (req, res) => {
    const { id } = req.params;
    const { name, price, quantity } = req.body;
    
    if (!name || isNaN(price) || isNaN(quantity)) {
        return res.status(400).json({ success: false, message: 'Ungültige Produktdaten' });
    }
    
    db.run(
        'UPDATE products SET name = ?, price = ?, quantity = ? WHERE id = ?',
        [name, price, quantity, id],
        function(err) {
            if (err) {
                console.error('Fehler beim Aktualisieren des Produkts:', err);
                return res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren des Produkts' });
            }
            
            res.json({ success: true, message: 'Produkt erfolgreich aktualisiert' });
        }
    );
});

app.get('/reports/daily', (req, res) => {
    const { date } = req.query;

    db.all(
        `SELECT 
            p.id, p.name, SUM(t.quantity) as total_quantity, 
            SUM(t.total) as total_sales, t.sellerID, t.transaction_id as trans_id
        FROM transactions t 
        JOIN products p ON t.product_id = p.id 
        WHERE t.date = ? 
        GROUP BY p.id, t.sellerID`,
        [date],
        (err, salesRows) => {
            if (err) {
                console.error('Fehler beim Abrufen des Tagesumsatzes:', err);
                return res.status(500).json({ success: false, message: 'Fehler beim Abrufen des Tagesumsatzes' });
            }

            db.all(
                `SELECT * FROM transactions WHERE date = ?`,
                [date],
                (err, transactionRows) => {
                    if (err) {
                        console.error('Fehler beim Abrufen der Transaktionen:', err);
                        return res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Transaktionen' });
                    }
                    
                    const totalSales = salesRows.reduce((sum, row) => sum + row.total_sales, 0);
                    
                    res.json({ 
                        success: true, 
                        date, 
                        sales: salesRows, 
                        transactions: transactionRows,
                        totalSales 
                    });
                }
            );
        }
    );
});

app.get('/reports/monthly', (req, res) => {
    const { month, year } = req.query;
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-31`;
    
    db.all(
        `SELECT 
            date, SUM(total) as daily_total,
            GROUP_CONCAT(DISTINCT sellerID) as sellerIDs
        FROM transactions 
        WHERE date BETWEEN ? AND ? 
        GROUP BY date 
        ORDER BY date`,
        [startDate, endDate],
        (err, rows) => {
            if (err) {
                console.error('Fehler beim Abrufen des Monatsumsatzes:', err);
                return res.status(500).json({ success: false, message: 'Fehler beim Abrufen des Monatsumsatzes' });
            }
            
            const totalSales = rows.reduce((sum, row) => sum + row.daily_total, 0);
            
            res.json({ success: true, month, year, sales: rows, totalSales });
        }
    );
});

app.get('/setup-database', (req, res) => {
    db.serialize(() => {
        db.run('CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price REAL, quantity INTEGER)');
        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id TEXT,
            product_id INTEGER,
            quantity INTEGER,
            unit_price REAL,
            total REAL,
            date TEXT,
            payment_id TEXT,
            sellerID INTEGER,
            name TEXT,
            FOREIGN KEY (product_id) REFERENCES products (id)
        )`);
        
        res.json({ success: true, message: 'Datenbank erfolgreich eingerichtet' });
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server läuft auf http://localhost:${port}`);
});
