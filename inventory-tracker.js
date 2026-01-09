// Simple Inventory Tracker - Just compare two CSV files
const SimpleInventoryTracker = {
    yesterdayInventory: null,
    todayInventory: null,
    
    async loadYesterdayCSV(file) {
        try {
            const text = await file.text();
            const parsed = Papa.parse(text, { header: true });
            
            // Convert to simple format
            const inventory = {};
            parsed.data.forEach(row => {
                if (row.Handle && row.SKU) {
                    const key = `${row.Handle}|${row['Option1 Value']}`;
                    inventory[key] = {
                        handle: row.Handle,
                        title: row.Title,
                        size: row['Option1 Value'],
                        sku: row.SKU,
                        quantity: parseInt(row['On hand (new)']) || 0
                    };
                }
            });
            
            this.yesterdayInventory = inventory;
            
            return {
                success: true,
                date: file.name.match(/\d{4}-\d{2}-\d{2}/) ? file.name.match(/\d{4}-\d{2}-\d{2}/)[0] : 'unknown',
                count: Object.keys(inventory).length
            };
        } catch (error) {
            console.error('Error loading yesterday CSV:', error);
            return { success: false, error: error.message };
        }
    },
    
    async loadTodayCSV(file) {
        try {
            const text = await file.text();
            const parsed = Papa.parse(text, { header: true });
            
            // Convert to simple format
            const inventory = {};
            parsed.data.forEach(row => {
                if (row.Handle && row.SKU) {
                    const key = `${row.Handle}|${row['Option1 Value']}`;
                    inventory[key] = {
                        handle: row.Handle,
                        title: row.Title,
                        size: row['Option1 Value'],
                        sku: row.SKU,
                        quantity: parseInt(row['On hand (new)']) || 0
                    };
                }
            });
            
            this.todayInventory = inventory;
            
            return {
                success: true,
                date: file.name.match(/\d{4}-\d{2}-\d{2}/) ? file.name.match(/\d{4}-\d{2}-\d{2}/)[0] : 'unknown',
                count: Object.keys(inventory).length
            };
        } catch (error) {
            console.error('Error loading today CSV:', error);
            return { success: false, error: error.message };
        }
    },
    
    compareInventories() {
        if (!this.yesterdayInventory || !this.todayInventory) {
            return {
                hasComparison: false,
                message: 'Please upload both yesterday and today CSV files.'
            };
        }
        
        const discontinued = [];
        const newProducts = [];
        const quantityChanges = [];
        
        // Find discontinued products (in yesterday but not today)
        for (const [key, item] of Object.entries(this.yesterdayInventory)) {
            if (!this.todayInventory[key]) {
                discontinued.push({
                    ...item,
                    previousQuantity: item.quantity
                });
            }
        }
        
        // Find new products (in today but not yesterday)
        for (const [key, item] of Object.entries(this.todayInventory)) {
            if (!this.yesterdayInventory[key]) {
                newProducts.push(item);
            } else {
                // Check for quantity changes
                const yesterdayQty = this.yesterdayInventory[key].quantity;
                const todayQty = item.quantity;
                if (yesterdayQty !== todayQty) {
                    quantityChanges.push({
                        ...item,
                        previousQuantity: yesterdayQty,
                        change: todayQty - yesterdayQty
                    });
                }
            }
        }
        
        return {
            hasComparison: true,
            stats: {
                totalYesterday: Object.keys(this.yesterdayInventory).length,
                totalToday: Object.keys(this.todayInventory).length,
                discontinued: discontinued.length,
                new: newProducts.length,
                changed: quantityChanges.length
            },
            discontinued,
            newProducts,
            quantityChanges
        };
    },
    
    getComparisonReport() {
        const comparison = this.compareInventories();
        
        if (!comparison.hasComparison) {
            return comparison.message;
        }
        
        let report = `INVENTORY COMPARISON REPORT\n`;
        report += `${'='.repeat(50)}\n\n`;
        
        report += `TOTAL PRODUCTS:\n`;
        report += `  Yesterday: ${comparison.stats.totalYesterday} variants\n`;
        report += `  Today: ${comparison.stats.totalToday} variants\n`;
        report += `  Change: ${comparison.stats.totalToday - comparison.stats.totalYesterday > 0 ? '+' : ''}${comparison.stats.totalToday - comparison.stats.totalYesterday}\n\n`;
        
        if (comparison.stats.discontinued > 0) {
            report += `DISCONTINUED (${comparison.stats.discontinued} variants):\n`;
            comparison.discontinued.forEach(item => {
                report += `   - ${item.title} - Size ${item.size} (Was: ${item.previousQuantity})\n`;
            });
            report += '\n';
        }
        
        if (comparison.stats.new > 0) {
            report += `NEW PRODUCTS (${comparison.stats.new} variants):\n`;
            comparison.newProducts.forEach(item => {
                report += `   - ${item.title} - Size ${item.size} (Qty: ${item.quantity})\n`;
            });
            report += '\n';
        }
        
        if (comparison.stats.changed > 0) {
            report += `QUANTITY CHANGES (${comparison.stats.changed} variants):\n`;
            comparison.quantityChanges.forEach(item => {
                const direction = item.change > 0 ? 'increased' : 'decreased';
                report += `   - ${item.title} - Size ${item.size}: ${item.previousQuantity} -> ${item.quantity} (${direction} by ${Math.abs(item.change)})\n`;
            });
        }
        
        return report;
    },
    
    generateUpdatedCSV() {
        if (!this.todayInventory) {
            return null;
        }
        
        const comparison = this.compareInventories();
        if (!comparison.hasComparison) {
            return null;
        }
        
        // Create CSV with discontinued products set to 0
        const allRows = [];
        
        // Add today's inventory
        for (const item of Object.values(this.todayInventory)) {
            allRows.push({
                Handle: item.handle,
                Title: item.title,
                'Option1 Name': 'Size',
                'Option1 Value': item.size,
                'Option2 Name': '',
                'Option2 Value': '',
                'Option3 Name': '',
                'Option3 Value': '',
                SKU: item.sku,
                Barcode: '',
                'HS Code': '',
                COO: '',
                Location: 'Needham',
                'Bin name': '',
                'Incoming (not editable)': '',
                'Unavailable (not editable)': '',
                'Committed (not editable)': '',
                'Available (not editable)': '',
                'On hand (current)': '',
                'On hand (new)': item.quantity
            });
        }
        
        // Add discontinued products with 0 quantity
        for (const item of comparison.discontinued) {
            allRows.push({
                Handle: item.handle,
                Title: item.title,
                'Option1 Name': 'Size',
                'Option1 Value': item.size,
                'Option2 Name': '',
                'Option2 Value': '',
                'Option3 Name': '',
                'Option3 Value': '',
                SKU: item.sku,
                Barcode: '',
                'HS Code': '',
                COO: '',
                Location: 'Needham',
                'Bin name': '',
                'Incoming (not editable)': '',
                'Unavailable (not editable)': '',
                'Committed (not editable)': '',
                'Available (not editable)': '',
                'On hand (current)': '',
                'On hand (new)': 0
            });
        }
        
        return Papa.unparse(allRows, {
            quotes: true,
            quoteChar: '"',
            delimiter: ','
        });
    }
};
