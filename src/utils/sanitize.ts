import DOMPurify from 'dompurify';

/**
 * Очищает HTML от вредоносных скриптов (XSS).
 * Используется перед вставкой контента через dangerouslySetInnerHTML.
 */
export const sanitizeHtml = (dirty: string): string => {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'img'],
        ALLOWED_ATTR: ['href', 'target', 'style', 'class', 'src', 'alt', 'title', 'width', 'height'],
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'base', 'head', 'link', 'meta'],
        FORBID_ATTR: ['onmouseover', 'onclick', 'onload', 'onerror', 'onmouseenter', 'onmouseleave', 'onfocus', 'onblur'],
        ADD_ATTR: ['target'] // Разрешаем target="_blank"
    });
};
