/**
 * Nuki Wiki 文档查看器 - 简洁版
 * 重点功能：语法高亮、简洁设计、优化的代码框和引用框
 */

class DocumentViewer {
    constructor() {
        this.fileStructure = null;
        this.currentFilePath = 'docs/index.md';
        this.categoryStates = {};
        this.isDarkMode = false;
        this.fireworksEnabled = true;
        this.isLoading = false;
        
        console.log('Initializing Nuki Wiki...');
        this.init();
    }

    async init() {
        try {
            this.createFireworksContainer();
            this.loadTheme();
            this.updateScrollbarStyles();
            this.loadFireworksState();
            await this.initCarousel();
            this.createFileStructure();

            // 添加文件存在性检查
            await this.filterExistingFiles();
            
            this.initializeCategoryStates();
            this.renderFileTree();
            this.bindEvents();
            this.initMouseFireworks();
            this.injectStyles();
            await this.loadDefaultFile();
            await this.checkNewMdUpdate();
            this.updateScrollbarStyles()

            console.log('Nuki Wiki initialized successfully');
        } catch (error) {
            console.error('Initialization failed:', error);
            this.showErrorPage();
        }
    }

    /**
     * 动态生成滚动条样式（不使用任何 CSS 变量，直接硬编码颜色）
     */
    updateScrollbarStyles() {
        // 移除旧的动态样式标签
        const oldStyle = document.getElementById('dynamic-scrollbar-style');
        if (oldStyle) oldStyle.remove();

        // 根据当前主题选择颜色
        const isDark = this.isDarkMode;
        const trackColor = isDark ? '#2d333b' : '#f1f1f1';
        const thumbColor = isDark ? '#545d68' : '#c1c1c1';
        const thumbHoverColor = isDark ? '#6e7681' : '#a8a8a8';

        const style = document.createElement('style');
        style.id = 'dynamic-scrollbar-style';
        style.textContent = `
            /* 公告弹窗滚动条 - 由 JS 控制，不依赖 CSS 变量 */
            #custom-modal .modal-markdown-content {
                scrollbar-width: thin !important;
                scrollbar-color: ${thumbColor} ${trackColor} !important;
            }
            #custom-modal .modal-markdown-content::-webkit-scrollbar {
                width: 8px !important;
                height: 8px !important;
            }
            #custom-modal .modal-markdown-content::-webkit-scrollbar-track {
                background: ${trackColor} !important;
                border-radius: 4px !important;
            }
            #custom-modal .modal-markdown-content::-webkit-scrollbar-thumb {
                background: ${thumbColor} !important;
                border-radius: 4px !important;
                border: 2px solid ${trackColor} !important;
            }
            #custom-modal .modal-markdown-content::-webkit-scrollbar-thumb:hover {
                background: ${thumbHoverColor} !important;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 初始化右下角轮播
     */
    async initCarousel() {
        const container = document.getElementById('carousel-container');
        const imgElement = document.getElementById('carousel-image');
        const indicators = document.getElementById('carousel-indicators');
        if (!container || !imgElement) return;

        try {
            // 1. 加载图片列表（从 JSON）
            const response = await fetch('assets/showing/images.json?t=' + Date.now());
            if (!response.ok) {
                console.warn('images.json not found, using fallback list');
                this.loadCarouselImages(['default.jpg']); // 备选
                return;
            }
            const imageList = await response.json();
            if (!Array.isArray(imageList) || imageList.length === 0) {
                console.warn('Empty image list, using fallback');
                this.loadCarouselImages(['default.jpg']);
                return;
            }

            // 2. 构建完整图片路径
            const basePath = 'assets/showing/';
            const fullPaths = imageList.map(name => basePath + name);

            // 3. 启动轮播
            this.carouselImages = fullPaths;
            this.currentIndex = 0;
            this.carouselInterval = null;

            // 渲染指示点
            indicators.innerHTML = fullPaths.map((_, i) => 
                `<span class="carousel-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`
            ).join('');

            // 显示第一张
            this.showCarouselImage(0);

            // 点击指示点切换
            indicators.querySelectorAll('.carousel-dot').forEach(dot => {
                dot.addEventListener('click', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    this.showCarouselImage(index);
                    this.resetCarouselTimer();
                });
            });

            // 启动自动轮播（每4秒切换）
            this.startCarouselTimer();

        } catch (error) {
            console.error('Carousel init failed:', error);
            this.loadCarouselImages(['default.jpg']);
        }
    }

    /**
     * 显示指定索引的图片
     */
    showCarouselImage(index) {
        const img = document.getElementById('carousel-image');
        const dots = document.querySelectorAll('.carousel-dot');
        if (!img) return;

        if (this.carouselImages && this.carouselImages.length > 0) {
            this.currentIndex = index % this.carouselImages.length;
            img.src = this.carouselImages[this.currentIndex];
            img.alt = `轮播图 ${this.currentIndex + 1}`;

            // 更新指示点
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === this.currentIndex);
            });
        }
    }

    /**
     * 切换到下一张
     */
    nextCarouselImage() {
        if (!this.carouselImages || this.carouselImages.length === 0) return;
        this.showCarouselImage(this.currentIndex + 1);
    }

    /**
     * 启动自动轮播
     */
    startCarouselTimer() {
        this.stopCarouselTimer();
        this.carouselInterval = setInterval(() => {
            this.nextCarouselImage();
        }, 4000);
    }

    /**
     * 停止自动轮播
     */
    stopCarouselTimer() {
        if (this.carouselInterval) {
            clearInterval(this.carouselInterval);
            this.carouselInterval = null;
        }
    }

    /**
     * 重置定时器（用户手动切换后重新计时）
     */
    resetCarouselTimer() {
        this.stopCarouselTimer();
        this.startCarouselTimer();
    }

    /**
     * 备选：硬编码图片列表（当 JSON 加载失败时）
     */
    loadCarouselImages(fallbackList) {
        const basePath = 'assets/showing/';
        this.carouselImages = fallbackList.map(name => basePath + name);
        this.currentIndex = 0;
        this.showCarouselImage(0);
        this.startCarouselTimer();
    }

    async checkNewMdUpdate() {
        const filePath = 'docs/new.md';
        try {
            const response = await fetch(`${filePath}?t=${Date.now()}`);
            if (!response.ok) {
                console.warn('new.md not found, skipping check');
                return;
            }
            const currentContent = await response.text();

            const storageKey = 'nuki_new_md_content';
            const savedContent = localStorage.getItem(storageKey);

            let shouldShow = false;
            if (savedContent === null) {
                shouldShow = true;
                console.log('First visit: showing new.md');
            } else if (savedContent !== currentContent) {
                shouldShow = true;
                console.log('new.md updated: showing new content');
            }

            if (shouldShow) {
                // 使用自定义模态框显示内容
                this.showModal('公告', currentContent);
                localStorage.setItem(storageKey, currentContent);
            }
        } catch (error) {
            console.error('Failed to check new.md update:', error);
        }
    }

    /**
     * 创建一个美观的自定义模态框
     * @param {string} title - 弹窗标题
     * @param {string} content - 显示的内容（支持 HTML）
     */
    showModal(title, content) {
        // 移除旧模态框
        const existingModal = document.getElementById('custom-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'custom-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
            padding: 20px;
            box-sizing: border-box;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: var(--bg-primary);
            color: var(--text-primary);
            max-width: 720px;
            width: 100%;
            max-height: 85vh;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
            display: flex;
            flex-direction: column;
            animation: slideUp 0.3s ease;
            border: 1px solid var(--border-color);
            overflow: hidden;   /* ← 关键：防止内容撑开 */
        `;

        // ---- 标题栏 ----
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 18px 24px;
            background: var(--bg-secondary);
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        `;
        header.innerHTML = `
            <h2 style="margin: 0; font-size: 1.3rem; font-weight: 600; color: var(--text-primary);">
                ${title}
            </h2>
            <button id="modal-close-btn" style="
                background: none;
                border: none;
                font-size: 1.8rem;
                line-height: 1;
                cursor: pointer;
                color: var(--text-secondary);
                padding: 0 8px;
                transition: color 0.2s;
                border-radius: 4px;
            ">&times;</button>
        `;

        // ---- 内容区（支持 Markdown） ----
        const body = document.createElement('div');
        body.className = 'markdown-content modal-markdown-content';
        body.style.cssText = `
            padding: 24px;
            overflow-y: auto;      /* 垂直滚动 */
            overflow-x: auto;      /* 水平滚动（应对宽表格/代码） */
            flex: 1;
            line-height: 1.6;
            font-size: 0.95rem;
            min-height: 0;         /* ← 关键：允许 flex 子项收缩 */
            background: var(--bg-primary);
            color: var(--text-primary);
        `;

        // 使用 marked 渲染 Markdown（如果可用）
        let htmlContent = content;
        if (typeof marked !== 'undefined') {
            try {
                htmlContent = marked.parse(content);
            } catch (e) {
                console.warn('Markdown parse failed, fallback to plain text', e);
            }
        }
        body.innerHTML = htmlContent;

        // 如果 hljs 存在，高亮代码块（marked 可能已经做了，但以防万一）
        if (typeof hljs !== 'undefined') {
            body.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }

        // ---- 底部按钮 ----
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 12px 24px;
            background: var(--bg-secondary);
            border-top: 1px solid var(--border-color);
            display: flex;
            justify-content: flex-end;
            flex-shrink: 0;
        `;
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        closeBtn.style.cssText = `
            background: var(--primary-color);
            color: white;
            border: none;
            padding: 8px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 500;
            transition: background 0.2s, transform 0.1s;
        `;
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = '#3b82f6';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = 'var(--primary-color)';
        });
        closeBtn.addEventListener('click', () => this.closeModal());
        footer.appendChild(closeBtn);

        // 组装
        modalContent.appendChild(header);
        modalContent.appendChild(body);
        modalContent.appendChild(footer);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // 关闭事件
        const closeX = modal.querySelector('#modal-close-btn');
        closeX.addEventListener('click', () => this.closeModal());

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });

        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    /**
     * 关闭模态框
     */
    closeModal() {
        const modal = document.getElementById('custom-modal');
        if (modal) {
            modal.style.opacity = '0';
            modal.style.transition = 'opacity 0.3s';
            setTimeout(() => modal.remove(), 300);
        }
    }
        /**
     * 检测文件是否存在
     */
    async checkFileExists(filePath) {
        try {
            const response = await fetch(filePath, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * 过滤不存在的文件
     */
    async filterExistingFiles() {
        console.log('Checking file existence...');
        
        // 检查独立文件
        const validStandalone = [];
        for (const file of this.fileStructure.standalone) {
            if (await this.checkFileExists(file.path)) {
                validStandalone.push(file);
            } else {
                console.warn('File not found:', file.path);
            }
        }
        this.fileStructure.standalone = validStandalone;
        
        // 检查分类文件
        for (const [category, files] of Object.entries(this.fileStructure.categories)) {
            const validFiles = [];
            for (const file of files) {
                if (await this.checkFileExists(file.path)) {
                    validFiles.push(file);
                } else {
                    console.warn('File not found:', file.path);
                }
            }
            
            if (validFiles.length > 0) {
                this.fileStructure.categories[category] = validFiles;
            } else {
                // 如果分类下没有有效文件，删除整个分类
                delete this.fileStructure.categories[category];
                console.warn('Category removed (no valid files):', category);
            }
        }
        
        console.log('File structure updated');
    }
    /**
     * 注入样式 - 简洁风格
     */
    injectStyles() {
        if (document.getElementById('wiki-custom-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'wiki-custom-styles';
        style.textContent = `
            /* 优化的分割线样式 */
            .standalone-section {
                margin-bottom: 1.0rem;
                padding-bottom: 0.5rem;
                /* 修改这里 - 优化分割线样式 */
                border-bottom: 1px solid var(--border-light);
                position: relative;
            }
            
            
            /* Markdown 内容中的分割线 */
            /* 主内容中的分割线 - 纯白色细线 */
            .markdown-content hr {
                border: none;
                height: 1px;
                background: #000000; /* 纯白 */
                margin: 1.5rem 0;
                opacity: 0.8;        /* 微调透明度，避免太白刺眼，但保持清晰可见 */
            }
            
            /* 深色模式下的分割线 */
            [data-theme="dark"] .markdown-content hr {
                border: none;
                height: 1px;
                background: var(--text-primary); /* 自动跟随文字颜色 */
                opacity: 0.3;
                margin: 1.5rem 0;
            }
            
            /* 分类之间的分割线 */
            .category + .category {
                border-top: 0px solid var(--border-light);
                padding-top: 1rem;
                margin-top: 1rem;
            }

            /* 简洁的文件树样式 */
            .standalone-section {
                margin-bottom: 1.0rem;
                padding-bottom: 0.5rem;
                border-bottom: 1px solid var(--border-light);
            }
            
            .standalone-link {
                display: flex !important;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem 1rem !important;
                font-weight: 500 !important;
                border: 1px solid var(--border-light);
                border-radius: 6px !important;
                background: var(--bg-secondary);
                margin-bottom: 0.5rem;
                transition: all 0.2s ease;
                color: var(--text-primary) !important;
                text-decoration: none;
            }
            
            .standalone-link:hover {
                border-color: var(--primary-color);
                background: var(--bg-hover);
                transform: translateX(2px);
            }
            
            .standalone-link.active {
                background: var(--primary-color);
                color: white !important;
                border-color: var(--primary-color);
            }
            
            /* 分类样式 */
            .category {
                margin-bottom: -1.45rem;
            }
            
            .category-header {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1rem;
                background: var(--bg-tertiary);
                border: 1px solid var(--border-light);
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                color: var(--text-primary);
                user-select: none;
                transition: all 0.2s ease;
            }
            
            .category-header:hover {
                background: var(--bg-hover);
                border-color: var(--primary-color);
            }
            
            .category-arrow {
                margin-left: auto;
                transition: transform 0.2s ease;
                color: var(--text-muted);
                font-size: 0.8rem;
            }
            
            .category-arrow.collapsed {
                transform: rotate(-90deg);
            }
            
            .category-files {
                margin-top: 0.5rem;
                margin-left: 1rem;
                border-left: 2px solid var(--border-light);
                padding-left: 1rem;
                overflow: hidden;
                transition: all 0.3s ease;
            }
            
            .category-files .file-link {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 0.75rem;
                color: var(--text-secondary);
                text-decoration: none;
                border-radius: 4px;
                margin-bottom: 0.25rem;
                font-size: 0.9rem;
                transition: all 0.2s ease;
            }
            
            .category-files .file-link:hover {
                background: var(--bg-hover);
                color: var(--text-primary);
                transform: translateX(4px);
            }
            
            .category-files .file-link.active {
                background: var(--primary-color);
                color: white;
                font-weight: 500;
            }
            
            /* 优化的代码框样式 */
            .markdown-content pre {
                position: relative;
                background: var(--bg-code) !important;
                border: 1px solid var(--border-light);
                border-radius: 8px;
                padding: 2.7rem 1rem 1rem 1.1rem;
                margin: 1.3rem 0;
                overflow-x: auto;
                font-family: 'Cascadia Code', 'JetBrains Mono', 'Fira Code', Monaco, 'Courier New', monospace;
                line-height: 1.3;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            
            /* 语言标签 */
            .language-label {
                position: absolute;
                top: 0.75rem;
                left: 0.9rem;
                background: var(--bg-tertiary);
                color: var(--text-secondary);
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                font-size: 0.7rem;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                z-index: 2;
            }
            
            /* 复制按钮 */
            .code-copy-button {
                position: absolute;
                top: 0.7rem;
                right: 1rem;
                background: var(--bg-tertiary);
                color: var(--text-secondary);
                border: 1px solid var(--border-medium);
                padding: 0.3rem 0.78rem;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.65rem;
                font-weight: 500;
                opacity: 0.8;
                transition: all 0.2s ease;
                z-index: 2;
            }
            
            .code-copy-button:hover {
                background: var(--primary-color);
                color: white;
                border-color: var(--primary-color);
                opacity: 1;
            }
            
            .markdown-content pre:hover .code-copy-button {
                opacity: 1;
            }
            
            /* 行内代码 */
            .markdown-content code:not(pre code) {
                background: var(--bg-code);
                color: var(--danger-color);
                padding: 0.2rem 0.4rem;
                border-radius: 3px;
                font-size: 0.85em;
                font-family: 'Cascadia Code', 'JetBrains Mono', Monaco, monospace;
                border: 1px solid var(--border-light);
            }
            
            /* 优化的引用框样式 */
            .markdown-content blockquote {
                position: relative;
                margin: 1rem 0;
                padding: 1.5rem 0.7rem 1.5rem 2.5rem;
                background: var(--bg-secondary);
                border-left: 4px solid var(--primary-color);
                border-radius: 0 8px 8px 0;
                color: var(--text-secondary);
                font-style: normal;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            }
            
            .markdown-content blockquote::before {
                content: '"';
                position: absolute;
                left: 1rem;
                top: 0.75rem;
                font-size: 2rem;
                font-weight: bold;
                color: var(--primary-color);
                opacity: 0.3;
                line-height: 1;
            }
            
            .markdown-content blockquote p {
                margin: 0;
                line-height: 1.6;
            }
            
            .markdown-content blockquote p:first-child {
                font-weight: 500;
            }
            
            /* 表格优化 */
            .markdown-content table {
                width: 100%;
                border-collapse: collapse;
                margin: 1.5rem 0;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            
            .markdown-content th,
            .markdown-content td {
                padding: 0.75rem 1rem;
                text-align: left;
                border-bottom: 1px solid var(--border-light);
            }
            
            .markdown-content th {
                background: var(--bg-tertiary);
                font-weight: 600;
                color: var(--text-primary);
            }
            
            .markdown-content tbody tr:hover {
                background: var(--bg-hover);
            }
            
            /* 语法高亮主题 */
            .hljs {
                background: transparent !important;
                color: var(--text-primary) !important;
            }
            
            .hljs-keyword,
            .hljs-selector-tag,
            .hljs-literal {
                color: #569cd6;
                font-weight: bold;
            }
            
            .hljs-string,
            .hljs-doctag {
                color: #ce9178;
            }
            
            .hljs-comment,
            .hljs-quote {
                color: #6a9955;
                font-style: italic;
            }
            
            .hljs-number,
            .hljs-regexp,
            .hljs-literal {
                color: #b5cea8;
            }
            
            .hljs-function,
            .hljs-title {
                color: #dcdcaa;
            }
            
            .hljs-params {
                color: var(--text-primary);
            }
            
            .hljs-variable,
            .hljs-attr {
                color: #9cdcfe;
            }
            
            .hljs-built_in,
            .hljs-class {
                color: #4ec9b0;
            }
            
            .hljs-operator {
                color: #d4d4d4;
            }
            
            /* 深色模式语法高亮 */
            [data-theme="dark"] .hljs-keyword {
                color: #569cd6;
            }
            
            [data-theme="dark"] .hljs-string {
                color: #ce9178;
            }
            
            [data-theme="dark"] .hljs-comment {
                color: #6a9955;
            }
            
            /* 动画效果 */
            .content-updated {
                animation: fadeInUp 0.4s ease-out;
            }
            
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            /* 烟花粒子 */
            .firework-particle {
                position: fixed;
                width: 4px;
                height: 4px;
                border-radius: 50%;
                pointer-events: none;
                z-index: 9999;
            }
            
            /* 加载动画 */
            .loading {
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 200px;
                color: var(--text-muted);
            }
            
            .spinner {
                width: 24px;
                height: 24px;
                border: 2px solid var(--border-light);
                border-top: 2px solid var(--primary-color);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-right: 1rem;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            #custom-modal .modal-markdown-content {
                scrollbar-width: thin !important;
                scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track) !important;
            }

            #custom-modal .modal-markdown-content::-webkit-scrollbar {
                width: 8px !important;
                height: 8px !important;
            }

            #custom-modal .modal-markdown-content::-webkit-scrollbar-track {
                background: var(--scrollbar-track) !important;
                border-radius: 4px !important;
            }

            #custom-modal .modal-markdown-content::-webkit-scrollbar-thumb {
                background: var(--scrollbar-thumb) !important;
                border-radius: 4px !important;
                border: 2px solid var(--scrollbar-track) !important;
            }

            #custom-modal .modal-markdown-content::-webkit-scrollbar-thumb:hover {
                background: var(--scrollbar-thumb-hover) !important;
            }


            /* 分割线保持原有的 12px 上下边距，但避免与区块间距叠加，可使用 padding 替代 */
            .category-divider,
            .ender-divider {
                margin: 0;           /* 去掉分割线自身外边距 */
                border: none;
                border-top: 0px solid #e0e0e0;
            }
            /* 然后为分割线前后的区块添加内边距来实现间距 */
            .category:last-of-type,
            .bottom-standalone-section:last-of-type {
                margin-bottom: 10px;
            }

        `;
        document.head.appendChild(style);
    }

    /**
     * 创建文件结构
     */
    createFileStructure() {
        // 原始分类数据
        const rawCategories = {
            "NoneBot开发": [
                { name: "首页", path: "docs/NoneBot开发日志/index.md" },
                { name: "认识NoneBot", path: "docs/NoneBot开发日志/nonebot.md" },
            ],
            "Nuki开发": [
                { name: "首页", path: "docs/Nuki开发日志/index.md" },
                { name: "认识Adapter", path: "docs/Nuki开发日志/adapter.md" },
            ],
            "杂七杂八小教程": [
                 { name: "错暑二文本配置", path: "docs/杂七杂八小教程/cuoshu2.md"},
                 { name: "错暑二番外剧情", path: "docs/杂七杂八小教程/fanwai1.md"}
            ]
        };

        // 输入列表（含可选的 category）
        const standaloneInput = [
            { name: "首页", path: "docs/index.md" },                         // 无 category → 上方独立
            { name: "更新日志", path: "docs/version.md" },                  // 无 category → 上方独立           // 归类
            { name: "Github介绍", path: "docs/README.md", category: "" , ender: 1 },  
            { name: "Python基础语法", path: "docs/python.md", category: "" }
        ];

        // 构建最终分类（复制原始分类）
        const categories = {};
        Object.keys(rawCategories).forEach(key => {
            categories[key] = [...rawCategories[key]];
        });

        // 结果容器
        const standaloneFinal = [];      // 上方独立项（无 category）
        const bottomStandalone = [];     // 下方独立项（category === "" 且无 ender 或 ender !== 1）
        const enderStandalone = [];      // 最终底部项（category === "" 且 ender === 1）

        // 遍历输入，分配归属
        standaloneInput.forEach(item => {
            if (item.category === undefined) {
                standaloneFinal.push({ name: item.name, path: item.path });
            } else if (item.category === '') {
                // category 为空字符串：检查 ender
                if (item.ender === 1) {
                    enderStandalone.push({ name: item.name, path: item.path });
                } else {
                    bottomStandalone.push({ name: item.name, path: item.path });
                }
            } else if (typeof item.category === 'string' && item.category.trim() !== '') {
                // 非空分类名 → 归入对应分类
                const catName = item.category.trim();
                if (!categories[catName]) {
                    categories[catName] = [];
                }
                categories[catName].push({ name: item.name, path: item.path });
            }
        });

        // 赋值给实例属性
        this.fileStructure = {
            standalone: standaloneFinal,
            categories: categories,
            bottomStandalone: bottomStandalone,
            enderStandalone: enderStandalone   // 新增
        };
    }

    
    /**
     * 初始化分类状态
     */
    initializeCategoryStates() {
        try {
            const saved = localStorage.getItem('nuki_category_states');
            if (saved) {
                this.categoryStates = JSON.parse(saved);
            } else {
                // 仅对当前存在的分类（多项）设置默认展开
                Object.keys(this.fileStructure.categories).forEach(category => {
                    this.categoryStates[this.getCategoryId(category)] = true;
                });
            }
        } catch (error) {
            console.warn('Failed to restore category states:', error);
            Object.keys(this.fileStructure.categories).forEach(category => {
                this.categoryStates[this.getCategoryId(category)] = true;
            });
        }
    }
    /**
     * 渲染文件树
     */
    renderFileTree() {
        const fileTree = document.getElementById('file-tree');
        if (!fileTree) return;

        let html = '';

        // ========== 1. 上方独立区 ==========
        html += '<div class="standalone-section">';
        this.fileStructure.standalone.forEach(file => {
            html += `
                <a href="#" 
                class="file-link standalone-link ${file.path === this.currentFilePath ? 'active' : ''}" 
                data-path="${file.path}">
                    ${file.name}
                </a>
            `;
        });
        html += '</div>';

        if (this.fileStructure.bottomStandalone && this.fileStructure.bottomStandalone.length > 0) {
            // 可添加一条分割线（可选）
            this.fileStructure.bottomStandalone.forEach(file => {
                html += `
                    <a href="#" 
                    class="file-link standalone-link ${file.path === this.currentFilePath ? 'active' : ''}" 
                    data-path="${file.path}">
                        ${file.name}
                    </a>
                `;
            });
            html += `</div>`;
        }

        // ========== 2. 分类区（动态判断是否可折叠） ==========
        Object.keys(this.fileStructure.categories).forEach(category => {
            const categoryId = this.getCategoryId(category);
            const files = this.fileStructure.categories[category];
            const isMulti = files.length > 0;        // 是否多项（可折叠）
            // 只有多项时才使用存储的状态，单项始终展开
            const isExpanded = isMulti ? (this.categoryStates[categoryId] !== false) : true;

            html += `<div class="category" data-category="${categoryId}">`;

            // 分类标题行
            html += `<div class="category-header" data-category-id="${categoryId}">`;
            html += `<span class="category-name">${category}</span>`;
            if (isMulti) {
                // 仅多项显示箭头
                html += `<span class="category-arrow ${isExpanded ? '' : 'collapsed'}">▼</span>`;
            }
            html += `</div>`;

            // 文件列表（单项始终 display:block，多项根据状态）
            const displayStyle = isMulti ? (isExpanded ? 'block' : 'none') : 'block';
            html += `<div class="category-files" style="display: ${displayStyle}">`;
            files.forEach(file => {
                html += `
                    <a href="#" 
                    class="file-link ${file.path === this.currentFilePath ? 'active' : ''}" 
                    data-path="${file.path}">
                        ${file.name}
                    </a>
                `;
            });
            html += `</div>`;

            html += `</div>`;
        });

        html += `</div>`;
        // ========== 4. 最终底部区（category="" 且 ender=1）—— 最后渲染 ==========
        if (this.fileStructure.enderStandalone && this.fileStructure.enderStandalone.length > 0) {
            // 再加一条分割线（与普通底部区分，可选）
            html += `</div>`;
            this.fileStructure.enderStandalone.forEach(file => {
                html += `
                    <a href="#" 
                    class="file-link standalone-link ${file.path === this.currentFilePath ? 'active' : ''}" 
                    data-path="${file.path}">
                        ${file.name}
                    </a>
                `;
            });
            html += `</div>`;
        }

        fileTree.innerHTML = html;
        this.bindFileTreeEvents();
        console.log('File tree rendered');
    }
    
    /**
     * 绑定文件树事件
     */
    bindFileTreeEvents() {
        // 分类展开/收缩：只对含有 .category-arrow 的 header 绑定
        document.querySelectorAll('.category-header').forEach(header => {
            const arrow = header.querySelector('.category-arrow');
            if (!arrow) return; // 单项无箭头，跳过绑定
            header.addEventListener('click', (e) => {
                e.preventDefault();
                const categoryId = header.getAttribute('data-category-id');
                if (categoryId) this.toggleCategory(categoryId);
            });
        });

        // 文件链接点击（保持不变）
        document.querySelectorAll('.file-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const filePath = link.getAttribute('data-path');
                if (filePath) this.loadFile(filePath);
            });
        });
    }

    /**
     * 切换分类展开/收缩
     */
    toggleCategory(categoryId) {
        const categoryElement = document.querySelector(`[data-category="${categoryId}"]`);
        if (!categoryElement) return;

        const filesElement = categoryElement.querySelector('.category-files');
        const arrowElement = categoryElement.querySelector('.category-arrow');
        
        if (!filesElement || !arrowElement) return;

        const isCurrentlyExpanded = filesElement.style.display !== 'none';
        
        if (isCurrentlyExpanded) {
            filesElement.style.display = 'none';
            arrowElement.classList.add('collapsed');
            this.categoryStates[categoryId] = false;
        } else {
            filesElement.style.display = 'block';
            arrowElement.classList.remove('collapsed');
            this.categoryStates[categoryId] = true;
        }
        
        this.saveCategoryStates();
    }

    /**
     * 获取分类ID
     */
    getCategoryId(category) {
        return category.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').toLowerCase();
    }

    /**
     * 保存分类状态
     */
    saveCategoryStates() {
        try {
            localStorage.setItem('nuki_category_states', JSON.stringify(this.categoryStates));
        } catch (error) {
            console.warn('Failed to save category states:', error);
        }
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 主题切换
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        this.updateScrollbarStyles();

        // 烟花切换
        const fireworksToggle = document.getElementById('fireworks-toggle');
        if (fireworksToggle) {
            fireworksToggle.addEventListener('click', () => this.toggleFireworks());
        }

        // 键盘快捷键
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.key === 'd') {
                event.preventDefault();
                this.toggleTheme();
            }
            if (event.key === 'f' || event.key === 'F') {
                if (!event.ctrlKey && !event.altKey) {
                    event.preventDefault();
                    this.toggleFireworks();
                }
            }
        });

        console.log('Events bound successfully');
    }

    /**
     * 初始化鼠标烟花效果
     */
    initMouseFireworks() {
        document.addEventListener('click', (e) => {
            if (this.fireworksEnabled) {
                this.createMouseFirework(e.clientX, e.clientY);
            }
        });
    }

    /**
     * 创建鼠标点击烟花效果
     */
    createMouseFirework(x, y) {
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
        
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.className = 'firework-particle';
            
            const color = colors[Math.floor(Math.random() * colors.length)];
            const angle = (i / 12) * 360;
            const distance = 40 + Math.random() * 60;
            const duration = 600 + Math.random() * 400;
            
            const endX = x + Math.cos(angle * Math.PI / 180) * distance;
            const endY = y + Math.sin(angle * Math.PI / 180) * distance;
            
            particle.style.cssText = `
                left: ${x}px;
                top: ${y}px;
                background: ${color};
                box-shadow: 0 0 4px ${color};
            `;
            
            document.body.appendChild(particle);
            
            particle.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${endX - x}px, ${endY - y}px) scale(0)`, opacity: 0 }
            ], {
                duration: duration,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }).onfinish = () => particle.remove();
        }
    }

    async forceReloadCurrentFile() {
        if (this.currentFilePath) {
            console.log('Force reloading current file:', this.currentFilePath);
            
            // 清除该文件的缓存
            if ('caches' in window) {
                try {
                    const cacheNames = await caches.keys();
                    for (const cacheName of cacheNames) {
                        const cache = await caches.open(cacheName);
                        await cache.delete(this.currentFilePath);
                    }
                } catch (error) {
                    console.warn('Failed to clear cache:', error);
                }
            }
            
            // 重新加载文件
            await this.loadFile(this.currentFilePath);
        }
    }
    
    /**
     * 加载文件 - 添加缓存破坏
     */
    async loadFile(filePath) {
        if (this.isLoading) return;

        this.isLoading = true;
        console.log('Loading file:', filePath);

        try {
            this.showLoadingState(filePath);
            
            // 添加时间戳参数破坏缓存
            const timestamp = new Date().getTime();
            const cacheBustedPath = `${filePath}?v=${timestamp}`;
            
            const response = await fetch(cacheBustedPath);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const markdown = await response.text();
            
            this.currentFilePath = filePath;
            this.updateActiveFileLink(filePath);
            this.renderMarkdown(markdown);
            
            console.log('File loaded successfully:', filePath);
            
        } catch (error) {
            console.error('File loading failed:', error);
            this.showFileNotFound(filePath, error);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * 显示加载状态
     */
    showLoadingState(filePath) {
        const content = document.getElementById('content');
        if (content) {
            const fileName = filePath.split('/').pop() || filePath;
            content.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <div>加载中... ${fileName}</div>
                </div>
            `;
        }
    }

    /**
     * 渲染 Markdown - 增强语法高亮
     */
    renderMarkdown(markdown) {
        const container = document.getElementById('content');
        if (!container) return;

        try {
            console.log('Rendering markdown content...');

            let html = '';
            
            if (typeof marked !== 'undefined') {
                // 配置 marked 支持语法高亮
                marked.setOptions({
                    highlight: (code, lang) => {
                        if (typeof hljs !== 'undefined') {
                            try {
                                if (lang && hljs.getLanguage(lang)) {
                                    return hljs.highlight(code, { language: lang }).value;
                                } else {
                                    return hljs.highlightAuto(code).value;
                                }
                            } catch (error) {
                                console.warn('Syntax highlighting failed:', error);
                                return this.escapeHtml(code);
                            }
                        }
                        return this.escapeHtml(code);
                    },
                    breaks: true,
                    gfm: true,
                    sanitize: false,
                    smartypants: false
                });

                html = marked.parse(markdown);
            } else {
                html = this.simpleMarkdownParse(markdown);
            }

            container.innerHTML = html;
            
            // 添加更新动画
            container.classList.add('content-updated');
            setTimeout(() => {
                container.classList.remove('content-updated');
            }, 400);

            // 增强代码块和链接
            this.enhanceCodeBlocks();
            this.enhanceLinks();

            // 滚动到顶部
            const contentBody = document.querySelector('.content-body');
            if (contentBody) {
                contentBody.scrollTo({ top: 0, behavior: 'smooth' });
            }

            console.log('Markdown rendered successfully');

        } catch (error) {
            console.error('Markdown rendering failed:', error);
            this.showRenderError(container, markdown, error);
        }
    }

    /**
     * 简化 Markdown 解析器
     */
    simpleMarkdownParse(markdown) {
        return this.escapeHtml(markdown)
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/$$([^$$]+)\]$([^)]+)$/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            .replace(/^\> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
            .replace(/^\* (.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            .replace(/\n\s*\n/g, '</p><p>')
            .replace(/^(?!<[h|p|u|c|b])(.+)$/gm, '<p>$1</p>');
    }

    /**
     * 增强代码块
     */
    enhanceCodeBlocks() {
        const codeBlocks = document.querySelectorAll('pre code');
        codeBlocks.forEach((block) => {
            const pre = block.parentElement;
            if (pre.querySelector('.code-copy-button')) return;
            
            pre.style.position = 'relative';
            
            // 检测语言
            const language = this.detectCodeLanguage(block);
            if (language) {
                const langLabel = document.createElement('div');
                langLabel.className = 'language-label';
                langLabel.textContent = language;
                pre.appendChild(langLabel);
            }
            
            // 添加复制按钮
            const copyButton = document.createElement('button');
            copyButton.className = 'code-copy-button';
            copyButton.textContent = '复制';
            
            copyButton.addEventListener('click', async () => {
                try {
                    await this.copyToClipboard(block.textContent);
                    copyButton.textContent = '已复制';
                    copyButton.style.background = 'var(--success-color)';
                    copyButton.style.color = 'white';
                    
                    setTimeout(() => {
                        copyButton.textContent = '复制';
                        copyButton.style.background = '';
                        copyButton.style.color = '';
                    }, 2000);
                } catch (error) {
                    console.error('Copy failed:', error);
                }
            });
            
            pre.appendChild(copyButton);
        });
    }

    /**
     * 检测代码语言
     */
    detectCodeLanguage(codeBlock) {
        const className = codeBlock.className;
        let match = className.match(/language-(\w+)/);
        if (match) return match[1].toUpperCase();
        
        const content = codeBlock.textContent.trim();
        if (content.includes('function') && content.includes('{')) return 'JS';
        if (content.includes('def ') && content.includes(':')) return 'PYTHON';
        if (content.includes('<') && content.includes('>')) return 'HTML';
        if (content.includes('SELECT') || content.includes('FROM')) return 'SQL';
        if (content.includes('#include') || content.includes('printf')) return 'C';
        if (content.includes('class ') && content.includes('public')) return 'JAVA';
        
        return null;
    }

/**
     * 增强链接
     */
    enhanceLinks() {
        const links = document.querySelectorAll('#content a');
        links.forEach(link => {
            if (link.href.startsWith('http')) {
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
            }
            
            // 内部链接处理
            if (link.href.includes('.md')) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const href = link.getAttribute('href');
                    if (href && href.endsWith('.md')) {
                        this.loadFile(href);
                    }
                });
            }
        });
    }

    /**
     * 更新活跃文件链接
     */
    updateActiveFileLink(filePath) {
        document.querySelectorAll('.file-link.active').forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`[data-path="${filePath}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    /**
     * 显示文件未找到
     */
    showFileNotFound(filePath, error) {
        const content = document.getElementById('content');
        if (content) {
            const fileName = filePath.split('/').pop() || filePath;
            content.innerHTML = `
                <div style="text-align: center; padding: 3rem 1rem;">
                    <h1 style="color: var(--text-primary); margin-bottom: 1rem; font-size: 2rem;">文件未找到</h1>
                    <div style="background: var(--bg-secondary); padding: 1.5rem; border-radius: 8px; margin: 2rem auto; max-width: 500px;">
                        <p style="color: var(--text-secondary); margin-bottom: 0.5rem;">
                            <strong>文件路径:</strong> <code style="background: var(--bg-code); padding: 0.25rem 0.5rem; border-radius: 4px;">${filePath}</code>
                        </p>
                        <p style="color: var(--text-secondary); margin: 0;">
                            <strong>文件名:</strong> ${fileName}
                        </p>
                    </div>
                    <p style="color: var(--text-muted); margin-bottom: 2rem; font-size: 0.9rem;">
                        错误信息: ${error.message}
                    </p>
                    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                        <button onclick="window.wikiApp.loadFile('docs/index.md')" style="
                            background: var(--primary-color);
                            color: white;
                            border: none;
                            padding: 1rem 2rem;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 1rem;
                            font-weight: 500;
                        ">返回首页</button>
                        <button onclick="location.reload()" style="
                            background: var(--secondary-color);
                            color: white;
                            border: none;
                            padding: 1rem 2rem;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 1rem;
                            font-weight: 500;
                        ">刷新页面</button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * 显示渲染错误
     */
    showRenderError(container, markdown, error) {
        container.innerHTML = `
            <div style="padding: 2rem; text-align: center; border: 2px dashed var(--border-medium); border-radius: 8px;">
                <h2 style="color: var(--danger-color); margin-bottom: 1rem;">内容渲染失败</h2>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                    无法渲染 Markdown 内容: ${error.message}
                </p>
                <details style="text-align: left; margin: 2rem auto; max-width: 600px;">
                    <summary style="cursor: pointer; color: var(--primary-color); font-weight: 600;">
                        查看原始内容
                    </summary>
                    <pre style="background: var(--bg-code); padding: 1rem; border-radius: 6px; overflow: auto; max-height: 400px; margin-top: 1rem; font-size: 0.875rem;">${this.escapeHtml(markdown.substring(0, 1000))}</pre>
                </details>
                <button onclick="location.reload()" style="background: var(--primary-color); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer;">重新加载</button>
            </div>
        `;
    }

    /**
     * 复制到剪贴板
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            console.log('Content copied to clipboard');
        } catch (error) {
            console.error('Copy failed:', error);
            throw error;
        }
    }

    /**
     * 切换主题
     */
    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        document.documentElement.setAttribute('data-theme', this.isDarkMode ? 'dark' : 'light');
        
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = this.isDarkMode ? '' : '';
        }
        
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const span = themeToggle.querySelector('span:last-child');
            if (span) {
                span.textContent = this.isDarkMode ? '切换主题' : '切换主题';
            }
        }
        
        this.saveTheme();
        console.log('Theme toggled to:', this.isDarkMode ? 'dark' : 'light');
    }

    /**
     * 保存主题设置
     */
    saveTheme() {
        try {
            localStorage.setItem('nuki_theme', this.isDarkMode ? 'dark' : 'light');
        } catch (error) {
            console.warn('Failed to save theme:', error);
        }
    }

    /**
     * 加载主题设置
     */
    loadTheme() {
        try {
            const savedTheme = localStorage.getItem('nuki_theme');
            this.isDarkMode = savedTheme === 'dark';
            document.documentElement.setAttribute('data-theme', this.isDarkMode ? 'dark' : 'light');
            
            const themeIcon = document.querySelector('.theme-icon');
            if (themeIcon) {
                themeIcon.textContent = this.isDarkMode ? '' : '';
            }
            
            console.log('Theme loaded:', this.isDarkMode ? 'dark' : 'light');
        } catch (error) {
            console.warn('Failed to load theme:', error);
        }
    }

    /**
     * 创建烟花容器
     */
    createFireworksContainer() {
        if (!document.getElementById('fireworks-container')) {
            const container = document.createElement('div');
            container.id = 'fireworks-container';
            container.className = 'fireworks-container';
            document.body.appendChild(container);
        }
    }

    /**
     * 切换烟花效果
     */
    toggleFireworks() {
        this.fireworksEnabled = !this.fireworksEnabled;
        
        const fireworksToggle = document.getElementById('fireworks-toggle');
        if (fireworksToggle) {
            const span = fireworksToggle.querySelector('span:last-child');
            if (span) {
                span.textContent = this.fireworksEnabled ? '关闭特效' : '开启特效';
            }
        }
        
        console.log('Fireworks:', this.fireworksEnabled ? 'enabled' : 'disabled');
        this.saveFireworksState();
    }

    /**
     * 保存烟花状态
     */
    saveFireworksState() {
        try {
            localStorage.setItem('nuki_fireworks', this.fireworksEnabled.toString());
        } catch (error) {
            console.warn('Failed to save fireworks state:', error);
        }
    }

    /**
     * 加载烟花状态
     */
    loadFireworksState() {
        try {
            const saved = localStorage.getItem('nuki_fireworks');
            this.fireworksEnabled = saved !== 'false';
        } catch (error) {
            console.warn('Failed to load fireworks state:', error);
        }
    }

    /**
     * 加载默认文件
     */
    async loadDefaultFile() {
        const defaultFiles = ['docs/index.md'];
        
        for (const file of defaultFiles) {
            try {
                await this.loadFile(file);
                console.log('Default file loaded:', file);
                return;
            } catch (error) {
                console.warn('Failed to load default file:', file);
                continue;
            }
        }
        
        this.showWelcomePage();
    }

    /**
     * 显示欢迎页面
     */
    showWelcomePage() {
        const content = document.getElementById('content');
        if (content) {
            content.innerHTML = `
                <div style="text-align: center; padding: 3rem 1rem; max-width: 800px; margin: 0 auto;">
                    <h1 style="color: var(--text-primary); margin-bottom: 2rem; font-size: 2.5rem; font-weight: 700;">
                        Nuki Wiki
                    </h1>
                    <p style="color: var(--text-secondary); margin-bottom: 3rem; font-size: 1.1rem; line-height: 1.6;">
                        现代化的文档查看器，支持 Markdown 渲染、代码高亮、主题切换
                    </p>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-bottom: 3rem;">
                        <div style="background: var(--bg-secondary); padding: 2rem; border-radius: 8px; border: 1px solid var(--border-light);">
                            <h3 style="color: var(--text-primary); margin-bottom: 1rem; font-size: 1.2rem;">Markdown 支持</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5;">
                                完整的 Markdown 语法支持，包括表格、代码块、链接等
                            </p>
                        </div>
                        <div style="background: var(--bg-secondary); padding: 2rem; border-radius: 8px; border: 1px solid var(--border-light);">
                            <h3 style="color: var(--text-primary); margin-bottom: 1rem; font-size: 1.2rem;">语法高亮</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5;">
                                支持多种编程语言的语法高亮显示
                            </p>
                        </div>
                        <div style="background: var(--bg-secondary); padding: 2rem; border-radius: 8px; border: 1px solid var(--border-light);">
                            <h3 style="color: var(--text-primary); margin-bottom: 1rem; font-size: 1.2rem;">主题切换</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5;">
                                支持深色和浅色主题，自动保存用户偏好
                            </p>
                        </div>
                        <div style="background: var(--bg-secondary); padding: 2rem; border-radius: 8px; border: 1px solid var(--border-light);">
                            <h3 style="color: var(--text-primary); margin-bottom: 1rem; font-size: 1.2rem;">响应式设计</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5;">
                                完美适配各种设备，提供流畅的阅读体验
                            </p>
                        </div>
                    </div>
                    <div style="margin-top: 2rem;">
                        <p style="color: var(--text-muted); margin-bottom: 1.5rem;">
                            从左侧导航选择文档开始阅读
                        </p>
                        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                            <button onclick="window.wikiApp.toggleTheme()" style="
                                background: var(--primary-color);
                                color: white;
                                border: none;
                                padding: 0.75rem 1.5rem;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 1rem;
                                font-weight: 500;
                                transition: all 0.2s ease;
                            ">切换主题</button>
                            <button onclick="window.wikiApp.toggleFireworks()" style="
                                background: var(--secondary-color);
                                color: white;
                                border: none;
                                padding: 0.75rem 1.5rem;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 1rem;
                                font-weight: 500;
                                transition: all 0.2s ease;
                            ">切换特效</button>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    /**
     * HTML 转义
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 显示错误页面
     */
    showErrorPage() {
        const content = document.getElementById('content');
        if (content) {
            content.innerHTML = `
                <div style="text-align: center; padding: 3rem 1rem;">
                    <h1 style="color: var(--danger-color); margin-bottom: 1rem; font-size: 2rem;">系统初始化失败</h1>
                    <p style="color: var(--text-secondary); margin-bottom: 2rem; max-width: 500px; margin-left: auto; margin-right: auto; line-height: 1.6;">
                        应用启动时遇到问题，请尝试刷新页面或检查网络连接。
                    </p>
                    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                        <button onclick="location.reload()" style="
                            background: var(--primary-color);
                            color: white;
                            border: none;
                            padding: 1rem 2rem;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 1rem;
                            font-weight: 500;
                        ">重新加载</button>
                        <button onclick="console.clear()" style="
                            background: var(--secondary-color);
                            color: white;
                            border: none;
                            padding: 1rem 2rem;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 1rem;
                            font-weight: 500;
                        ">清除控制台</button>
                    </div>
                </div>
            `;
        }
    }
}

// 页面加载完成后启动应用
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Nuki Wiki...');
    window.wikiApp = new DocumentViewer();
});

console.log('Nuki Wiki script loaded');