// Main Unified Converter Controller - FIXED
const BrandConverter = {
    brands: {
        saucony: { file: null, inventory: [], csv: '' },
        hoka: { file: null, inventory: [], csv: '' },
        puma: { file: null, inventory: [], csv: '' },
        newbalance: { file: null, inventory: [], csv: '' },
        asics: { file: null, inventory: [], csv: '', csvOnly: true },
        brooks: { file: null, inventory: [], csv: '', csvOnly: true },
        on: { file: null, inventory: [], csv: '', csvOnly: true }
    },
    
    init() {
        // Setup drag and drop for all brands
        ['saucony', 'hoka', 'puma', 'newbalance', 'asics', 'brooks', 'on'].forEach(brand => {
            this.setupBrandDropzone(brand);
        });
    },
    
    setupBrandDropzone(brand) {
        const dropZone = document.getElementById(`${brand}-dropzone`);
        const fileInput = document.getElementById(`${brand}-file`);
        
        dropZone.addEventListener('click', () => fileInput.click());
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                this.handleFile(brand, e.dataTransfer.files[0]);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFile(brand, e.target.files[0]);
            }
        });
    },
    
    handleFile(brand, file) {
        this.brands[brand].file = file;
        document.getElementById(`${brand}-filename`).textContent = file.name;
        document.getElementById(`${brand}-uploaded`).style.display = 'flex';
        document.getElementById(`${brand}-convert`).style.display = 'block';
        document.getElementById(`${brand}-dropzone`).style.display = 'none';
        this.hideStatus(brand);
    },
    
    showStatus(brand, message, type) {
        const statusDiv = document.getElementById(`${brand}-status`);
        statusDiv.textContent = message;
        statusDiv.className = 'status ' + type;
        statusDiv.style.display = 'block';
    },
    
    hideStatus(brand) {
        document.getElementById(`${brand}-status`).style.display = 'none';
    },
    
    updateDownloadSection() {
        const downloadSection = document.getElementById('download-section');
        const individualDownloads = document.getElementById('individual-downloads');
        const unifiedSection = document.getElementById('unified-section');
        const unifiedInfo = document.getElementById('unified-info');
        
        individualDownloads.innerHTML = '';
        
        let hasAnyInventory = false;
        let totalVariants = 0;
        
        ['saucony', 'hoka', 'puma', 'newbalance'].forEach(brand => {
            if (this.brands[brand].inventory.length > 0) {
                hasAnyInventory = true;
                totalVariants += this.brands[brand].inventory.length;
                
                const btn = document.createElement('button');
                btn.className = `download-btn ${brand}`;
                btn.innerHTML = `📥 ${this.getBrandDisplayName(brand)} (${this.brands[brand].inventory.length} variants)`;
                btn.onclick = () => this.downloadBrandInventory(brand);
                individualDownloads.appendChild(btn);
            }
        });
        
        if (hasAnyInventory) {
            downloadSection.style.display = 'block';
            unifiedInfo.textContent = `Ready to combine ${totalVariants} total variants from all brands`;
        } else {
            downloadSection.style.display = 'none';
        }
    },
    
    getBrandDisplayName(brand) {
        const names = {
            saucony: 'Saucony',
            hoka: 'HOKA',
            puma: 'Puma',
            newbalance: 'New Balance',
            asics: 'ASICS',
            brooks: 'Brooks',
            on: 'ON Running'
        };
        return names[brand] || brand;
    },
    
    downloadBrandInventory(brand) {
        const date = new Date().toISOString().split('T')[0];
        const filename = `${brand}-inventory-${date}.csv`;
        const csvData = this.brands[brand].csv;
        
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

// Clear file function
function clearFile(brand) {
    BrandConverter.brands[brand].file = null;
    BrandConverter.brands[brand].inventory = [];
    BrandConverter.brands[brand].csv = '';
    
    document.getElementById(`${brand}-file`).value = '';
    document.getElementById(`${brand}-uploaded`).style.display = 'none';
    document.getElementById(`${brand}-convert`).style.display = 'none';
    document.getElementById(`${brand}-dropzone`).style.display = 'flex';
    BrandConverter.hideStatus(brand);
    BrandConverter.updateDownloadSection();
}

// Convert brand function
async function convertBrand(brand) {
    const file = BrandConverter.brands[brand].file;
    if (!file) {
        BrandConverter.showStatus(brand, 'Please select a file first!', 'error');
        return;
    }
    
    BrandConverter.showStatus(brand, 'Processing...', 'success');
    
    try {
        let inventory;
        
        // Check if this is a CSV-only brand (ASICS, Brooks, ON)
        if (BrandConverter.brands[brand].csvOnly) {
            // Parse the already-formatted CSV file
            const text = await file.text();
            const parsed = Papa.parse(text, { header: true });
            inventory = parsed.data.filter(row => row.Handle && row.Handle.trim() !== '');
            BrandConverter.brands[brand].inventory = inventory;
            BrandConverter.brands[brand].csv = text;
        } else {
            // Use brand-specific converters for brands that need conversion
            switch(brand) {
                case 'saucony':
                    inventory = await SauconyConverter.convert(file);
                    BrandConverter.brands[brand].inventory = inventory;
                    BrandConverter.brands[brand].csv = SauconyConverter.generateInventoryCSV();
                    break;
                case 'hoka':
                    inventory = await HokaConverter.convert(file);
                    BrandConverter.brands[brand].inventory = inventory;
                    BrandConverter.brands[brand].csv = HokaConverter.generateInventoryCSV();
                    break;
                case 'puma':
                    inventory = await PumaConverter.convert(file);
                    BrandConverter.brands[brand].inventory = inventory;
                    BrandConverter.brands[brand].csv = PumaConverter.generateInventoryCSV();
                    break;
                case 'newbalance':
                    inventory = await NewBalanceConverter.convert(file);
                    BrandConverter.brands[brand].inventory = inventory;
                    BrandConverter.brands[brand].csv = NewBalanceConverter.generateInventoryCSV();
                    break;
            }
        }
        
        BrandConverter.showStatus(brand, `Processed ${inventory.length} variants`, 'success');
        BrandConverter.updateDownloadSection();
    } catch (error) {
        BrandConverter.showStatus(brand, 'Error: ' + error.message, 'error');
        console.error('Conversion error:', error);
    }
}

// Download unified inventory - FIXED to match individual converter format exactly
function downloadUnified() {
    const allInventory = [];
    
    ['saucony', 'hoka', 'puma', 'newbalance', 'asics', 'brooks', 'on'].forEach(brand => {
        if (BrandConverter.brands[brand].inventory.length > 0) {
            allInventory.push(...BrandConverter.brands[brand].inventory);
        }
    });
    
    if (allInventory.length === 0) {
        alert('Please convert at least one brand first!');
        return;
    }
    
    // CRITICAL FIX: Match the exact format from individual converters with quoted headers
    const inventoryHeaders = ['Handle', 'Title', '"Option1 Name"', '"Option1 Value"', '"Option2 Name"', '"Option2 Value"', 
                   '"Option3 Name"', '"Option3 Value"', 'SKU', 'Barcode', '"HS Code"', 'COO', 'Location', '"Bin name"', 
                   '"Incoming (not editable)"', '"Unavailable (not editable)"', '"Committed (not editable)"', 
                   '"Available (not editable)"', '"On hand (current)"', '"On hand (new)"'];
    
    const csvRows = [inventoryHeaders.join(',')];
    
    allInventory.forEach(row => {
        const csvRow = [
            row.Handle,
            `"${(row.Title || '').replace(/"/g, '""')}"`,  // Properly escape quotes in titles
            row['Option1 Name'],
            row['Option1 Value'],
            row['Option2 Name'] || '',
            row['Option2 Value'] || '',
            row['Option3 Name'] || '',
            row['Option3 Value'] || '',
            row.SKU,
            row.Barcode || '',
            '', '',  // HS Code and COO - empty
            row.Location,
            '', '', '', '', '', '',  // All the "not editable" and "current" fields
            row['On hand (new)']
        ];
        csvRows.push(csvRow.join(','));
    });
    
    const csvData = csvRows.join('\n');
    
    const date = new Date().toISOString().split('T')[0];
    const filename = `unified-inventory-${date}.csv`;
    
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    BrandConverter.init();
});