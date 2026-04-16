window.addEventListener('load', function () {
    // Wait for Swagger UI to be fully loaded
    setTimeout(function () {
        const infoContainer = document.querySelector('.information-container');
        if (infoContainer && !document.getElementById('custom-export-buttons')) {
            // Create export container (simple card style)
            const exportContainer = document.createElement('div');
            exportContainer.id = 'custom-export-buttons';
            exportContainer.style.cssText = `
                    box-sizing: border-box;
    margin: 0 auto 20px;
    max-width: 1460px;
    padding: 0 20px;
    width: 100%;
            `;

            // Title
            const title = document.createElement('div');
            title.innerHTML = `<strong>📤 Export API:</strong>`;
            title.style.cssText = `
                color: #1f2937;
                margin-bottom: 10px;
                font-size: 14px;
            `;
            exportContainer.appendChild(title);

            // Links container
            const linksContainer = document.createElement('div');
            linksContainer.style.cssText = `
                display: flex;
                gap: 20px;
                flex-wrap: wrap;
                align-items: center;
            `;

            // Create Postman link
            const postmanLink = createExportLink(
                '🚀 Postman',
                function () {
                    exportToPostman();
                }
            );

            // Create OpenAPI JSON link
            const jsonLink = createExportLink(
                '📋 JSON',
                function () {
                    downloadOpenAPISpec('json');
                }
            );

            // Create OpenAPI YAML link
            const yamlLink = createExportLink(
                '📄 YAML',
                function () {
                    downloadOpenAPISpec('yaml');
                }
            );

            // Create copy link
            const copyLink = createExportLink(
                '� Copy Link',
                function () {
                    copyPostmanLink();
                }
            );

            linksContainer.appendChild(postmanLink);
            linksContainer.appendChild(createSeparator());
            linksContainer.appendChild(jsonLink);
            linksContainer.appendChild(createSeparator());
            linksContainer.appendChild(yamlLink);
            linksContainer.appendChild(createSeparator());
            linksContainer.appendChild(copyLink);

            exportContainer.appendChild(linksContainer);

            // Insert after info container
            infoContainer.parentNode.insertBefore(
                exportContainer,
                infoContainer.nextSibling
            );
        }
    }, 1000);
});

/**
 * Create styled export link (simple text link)
 */
function createExportLink(text, onClick) {
    const link = document.createElement('a');
    link.textContent = text;
    link.href = '#';
    link.style.cssText = `
        color: #3b82f6;
        text-decoration: none;
        font-size: 14px;
        cursor: pointer;
        transition: color 0.2s ease;
        white-space: nowrap;
    `;

    link.onmouseover = function () {
        this.style.color = '#2563eb';
        this.style.textDecoration = 'underline';
    };

    link.onmouseout = function () {
        this.style.color = '#3b82f6';
        this.style.textDecoration = 'none';
    };

    link.onclick = function (e) {
        e.preventDefault();
        onClick();
    };

    return link;
}

/**
 * Create separator between links
 */
function createSeparator() {
    const separator = document.createElement('span');
    separator.textContent = '|';
    separator.style.cssText = `
        color: #d1d5db;
        font-size: 14px;
    `;
    return separator;
}

/**
 * Export to Postman
 */
function exportToPostman() {
    try {
        const currentUrl = window.location.origin;
        const openApiUrl = `${currentUrl}/api-docs.json`;

        // Create Postman import link
        const postmanUrl = `https://www.postman.com/import?url=${encodeURIComponent(openApiUrl)}`;

        // Open in new tab
        window.open(postmanUrl, '_blank');

        // Show success message
        showNotification(
            '✅ Opening Postman...',
            'If Postman app is installed, it will open automatically. Otherwise, you can import manually.',
            'success'
        );
    } catch (error) {
        console.error('Export to Postman error:', error);
        showNotification('❌ Export Failed', error.message, 'error');
    }
}

/**
 * Download OpenAPI spec
 */
function downloadOpenAPISpec(format) {
    try {
        const currentUrl = window.location.origin;
        let downloadUrl = '';
        let filename = '';

        if (format === 'json') {
            downloadUrl = `${currentUrl}/api-docs.json`;
            filename = 'openapi-spec.json';
        } else if (format === 'yaml') {
            // Most Swagger setups serve JSON, so we'll convert or provide alternative
            downloadUrl = `${currentUrl}/api-docs.json`;
            filename = 'openapi-spec.json'; // We'll fetch and convert if needed
        }

        // Fetch and download
        fetch(downloadUrl)
            .then((response) => response.json())
            .then((data) => {
                let content, mimeType;

                if (format === 'yaml') {
                    // Simple JSON to YAML conversion
                    content = jsonToYaml(data);
                    mimeType = 'application/x-yaml';
                    filename = 'openapi-spec.yaml';
                } else {
                    content = JSON.stringify(data, null, 2);
                    mimeType = 'application/json';
                }

                // Create download
                const blob = new Blob([content], { type: mimeType });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                showNotification(
                    '✅ Download Started',
                    `${filename} is being downloaded`,
                    'success'
                );
            })
            .catch((error) => {
                console.error('Download error:', error);
                showNotification('❌ Download Failed', error.message, 'error');
            });
    } catch (error) {
        console.error('Download error:', error);
        showNotification('❌ Download Failed', error.message, 'error');
    }
}

/**
 * Copy Postman import link to clipboard
 */
function copyPostmanLink() {
    try {
        const currentUrl = window.location.origin;
        const openApiUrl = `${currentUrl}/api-docs.json`;
        const postmanUrl = `https://www.postman.com/import?url=${encodeURIComponent(openApiUrl)}`;

        // Copy to clipboard
        navigator.clipboard.writeText(postmanUrl).then(
            function () {
                showNotification(
                    '✅ Link Copied!',
                    'Postman import link has been copied to clipboard. Open Postman and paste the link.',
                    'success'
                );
            },
            function (err) {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = postmanUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);

                showNotification(
                    '✅ Link Copied!',
                    'Postman import link has been copied to clipboard.',
                    'success'
                );
            }
        );
    } catch (error) {
        console.error('Copy error:', error);
        showNotification('❌ Copy Failed', error.message, 'error');
    }
}

/**
 * Simple JSON to YAML converter
 */
function jsonToYaml(obj, indent = 0) {
    let yaml = '';
    const spaces = '  '.repeat(indent);

    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];

            if (value === null) {
                yaml += `${spaces}${key}: null\n`;
            } else if (typeof value === 'object' && !Array.isArray(value)) {
                yaml += `${spaces}${key}:\n${jsonToYaml(value, indent + 1)}`;
            } else if (Array.isArray(value)) {
                yaml += `${spaces}${key}:\n`;
                value.forEach((item) => {
                    if (typeof item === 'object') {
                        yaml += `${spaces}- \n${jsonToYaml(item, indent + 2)}`;
                    } else {
                        yaml += `${spaces}- ${item}\n`;
                    }
                });
            } else if (typeof value === 'string') {
                yaml += `${spaces}${key}: "${value}"\n`;
            } else {
                yaml += `${spaces}${key}: ${value}\n`;
            }
        }
    }

    return yaml;
}

/**
 * Show notification
 */
function showNotification(title, message, type = 'info') {
    // Remove existing notification if any
    const existing = document.getElementById('custom-notification');
    if (existing) {
        existing.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'custom-notification';

    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6',
    };

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-left: 4px solid ${colors[type] || colors.info};
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 10000;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;

    notification.innerHTML = `
        <div style="display: flex; align-items: start; gap: 12px;">
            <div style="flex: 1;">
                <h4 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px; font-weight: 600;">
                    ${title}
                </h4>
                <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                    ${message}
                </p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 20px; padding: 0; line-height: 1;">
                ×
            </button>
        </div>
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}
