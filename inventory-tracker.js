// Inventory Tracker - HYBRID: Uses localStorage + file backup for best of both worlds
const InventoryTracker = {
    STORAGE_KEY: 'runhouse_inventory_history',
    previousInventoryData: null,
    currentInventoryData: null,
    usingFileUpload: false, // Track if user manually uploaded a file
    
    // Initialize: Load from localStorage automatically
    init() {
        this.loadFromLocalStorage();
    },
    
    // Load previous snapshot from localStorage
    loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) {
                console.log('No previous inventory found in localStorage');
                return null;
            }
            
            const history = JSON.parse(stored);
            const today = new Date().toISOString().split('T')[0];
            
            // Find most recent snapshot that's not today
            const dates = Object.keys(history).sort().reverse();
            for (const date of dates) {
                if (date !== today) {
                    this.previousInventoryData = history[date];
                    console.log(`Loaded previous snapshot from localStorage: ${date}`);
                    return {
                        success: true,
                        source: 'localStorage',
                        date: date,
                        productCount: Object.values(history[date].products).reduce((sum, arr) => sum + arr.length, 0)
                    };
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return null;
        }
    },
    
    // Save to localStorage
    saveToLocalStorage(snapshot) {
        try {
            const history = this.getLocalStorageHistory();
            const today = snapshot.date;
            
            // Save today's snapshot
            history[today] = snapshot;
            
            // Keep only last 7 days to avoid storage limits
            const dates = Object.keys(history).sort().reverse();
            if (dates.length > 7) {
                dates.slice(7).forEach(oldDate => delete history[oldDate]);
            }
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
            console.log(`Saved snapshot to localStorage: ${today}`);
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    },
    
    // Get localStorage history
    getLocalStorageHistory() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error reading localStorage:', error);
            return {};
        }
    },
    
    // Process uploaded previous day's snapshot file (BACKUP METHOD)
    async loadPreviousSnapshot(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            // Validate the data structure
            if (!data.date || !data.products) {
                throw new Error('Invalid snapshot file format');
            }
            
            this.previousInventoryData = data;
            this.usingFileUpload = true; // Mark that user manually uploaded
            
            return {
                success: true,
                source: 'file',
                date: data.date,
                productCount: Object.values(data.products).reduce((sum, arr) => sum + arr.length, 0)
            };
        } catch (error) {
            console.error('Error loading previous snapshot:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Create snapshot from current inventory
    createCurrentSnapshot(brandInventories) {
        const today = new Date().toISOString().split('T')[0];
        
        const snapshot = {
            date: today,
            timestamp: Date.now(),
            products: {}
        };
        
        // Collect all products from all brands
        for (const [brand, data] of Object.entries(brandInventories)) {
            if (data.inventory && data.inventory.length > 0) {
                snapshot.products[brand] = data.inventory.map(item => ({
                    handle: item.Handle,
                    title: item.Title,
                    sku: item.SKU,
                    size: item['Option1 Value'],
                    barcode: item.Barcode || '',
                    quantity: item['On hand (new)']
                }));
            }
        }
        
        this.currentInventoryData = snapshot;
        
        // AUTOMATICALLY save to localStorage
        this.saveToLocalStorage(snapshot);
        
        return snapshot;
    },
    
    // Download today's snapshot for use on different computer (BACKUP METHOD)
    downloadSnapshot() {
        if (!this.currentInventoryData) {
            alert('No inventory data to save. Please upload and convert your files first.');
            return;
        }
        
        const jsonData = JSON.stringify(this.currentInventoryData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const filename = `inventory-snapshot-${this.currentInventoryData.date}.json`;
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return filename;
    },
    
    // Check if we have a previous snapshot (from localStorage or file upload)
    hasPreviousSnapshot() {
        return this.previousInventoryData !== null;
    },
    
    // Get source of previous snapshot
    getPreviousSnapshotSource() {
        if (!this.previousInventoryData) return null;
        return this.usingFileUpload ? 'file' : 'localStorage';
    },
    
    // Compare current inventory with previous snapshot
    compareInventories() {
        if (!this.previousInventoryData) {
            return {
                hasComparison: false,
                message: 'No previous inventory uploaded for comparison.',
                discontinued: [],
                newProducts: []
            };
        }
        
        if (!this.currentInventoryData) {
            return {
                hasComparison: false,
                message: 'No current inventory data available.',
                discontinued: [],
                newProducts: []
            };
        }
        
        const result = {
            hasComparison: true,
            previousDate: this.previousInventoryData.date,
            currentDate: this.currentInventoryData.date,
            discontinued: [],
            newProducts: [],
            stats: {
                totalPrevious: 0,
                totalCurrent: 0,
                discontinued: 0,
                new: 0
            }
        };
        
        // Create lookup map for current inventory
        const currentProductMap = new Map();
        for (const [brand, products] of Object.entries(this.currentInventoryData.products)) {
            result.stats.totalCurrent += products.length;
            products.forEach(item => {
                const key = `${brand}|${item.handle}|${item.size}`;
                currentProductMap.set(key, {
                    brand,
                    ...item
                });
            });
        }
        
        // Find discontinued products
        for (const [brand, previousProducts] of Object.entries(this.previousInventoryData.products)) {
            result.stats.totalPrevious += previousProducts.length;
            
            previousProducts.forEach(prevItem => {
                const key = `${brand}|${prevItem.handle}|${prevItem.size}`;
                
                if (!currentProductMap.has(key)) {
                    // This product existed before but not now - DISCONTINUED
                    result.discontinued.push({
                        brand,
                        handle: prevItem.handle,
                        title: prevItem.title,
                        sku: prevItem.sku,
                        size: prevItem.size,
                        barcode: prevItem.barcode || '',
                        previousQuantity: prevItem.quantity
                    });
                }
            });
        }
        
        // Find NEW products
        currentProductMap.forEach((currentItem, key) => {
            const [brand, handle, size] = key.split('|');
            const previousBrand = this.previousInventoryData.products[brand];
            
            if (!previousBrand) {
                result.newProducts.push(currentItem);
                return;
            }
            
            const existedBefore = previousBrand.some(
                p => p.handle === handle && p.size === size
            );
            
            if (!existedBefore) {
                result.newProducts.push(currentItem);
            }
        });
        
        result.stats.discontinued = result.discontinued.length;
        result.stats.new = result.newProducts.length;
        
        return result;
    },
    
    // Generate zero-quantity inventory rows for discontinued products
    generateDiscontinuedInventoryRows() {
        const comparison = this.compareInventories();
        
        if (!comparison.hasComparison || comparison.discontinued.length === 0) {
            return [];
        }
        
        const discontinuedRows = [];
        
        comparison.discontinued.forEach(item => {
            discontinuedRows.push({
                Handle: item.handle,
                Title: item.title,
                'Option1 Name': 'Size',
                'Option1 Value': item.size,
                'Option2 Name': '',
                'Option2 Value': '',
                'Option3 Name': '',
                'Option3 Value': '',
                SKU: item.sku,
                Barcode: item.barcode,
                'HS Code': '',
                COO: '',
                Location: 'Needham',
                'Bin name': '',
                'Incoming (not editable)': '',
                'Unavailable (not editable)': '',
                'Committed (not editable)': '',
                'Available (not editable)': '',
                'On hand (current)': '',
                'On hand (new)': 0  // SET TO ZERO
            });
        });
        
        return discontinuedRows;
    },
    
    // Get human-readable comparison report
    getComparisonReport() {
        const comparison = this.compareInventories();
        
        if (!comparison.hasComparison) {
            return comparison.message;
        }
        
        let report = `📊 Inventory Comparison Report\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        report += `Previous Date: ${comparison.previousDate}\n`;
        report += `Current Date: ${comparison.currentDate}\n\n`;
        
        report += `📦 Total Products:\n`;
        report += `  Previous: ${comparison.stats.totalPrevious} variants\n`;
        report += `  Current: ${comparison.stats.totalCurrent} variants\n`;
        report += `  Change: ${comparison.stats.totalCurrent - comparison.stats.totalPrevious > 0 ? '+' : ''}${comparison.stats.totalCurrent - comparison.stats.totalPrevious}\n\n`;
        
        if (comparison.stats.discontinued > 0) {
            report += `❌ DISCONTINUED (${comparison.stats.discontinued} variants):\n`;
            report += `   These will be set to 0 quantity in the unified CSV:\n\n`;
            
            // Group by brand
            const byBrand = {};
            comparison.discontinued.forEach(item => {
                if (!byBrand[item.brand]) byBrand[item.brand] = [];
                byBrand[item.brand].push(item);
            });
            
            Object.entries(byBrand).forEach(([brand, items]) => {
                report += `   ${brand.toUpperCase()}:\n`;
                items.forEach(item => {
                    report += `     • ${item.title} - Size ${item.size}\n`;
                });
                report += '\n';
            });
        } else {
            report += `✅ No discontinued products\n\n`;
        }
        
        if (comparison.stats.new > 0) {
            report += `✨ NEW PRODUCTS (${comparison.stats.new} variants):\n`;
            
            // Group by brand
            const byBrand = {};
            comparison.newProducts.forEach(item => {
                if (!byBrand[item.brand]) byBrand[item.brand] = [];
                byBrand[item.brand].push(item);
            });
            
            Object.entries(byBrand).forEach(([brand, items]) => {
                report += `   ${brand.toUpperCase()}:\n`;
                items.forEach(item => {
                    report += `     • ${item.title} - Size ${item.size}\n`;
                });
                report += '\n';
            });
        } else {
            report += `No new products\n`;
        }
        
        return report;
    },
    
    // Clear all tracking data
    clear() {
        this.previousInventoryData = null;
        this.currentInventoryData = null;
    }
};
