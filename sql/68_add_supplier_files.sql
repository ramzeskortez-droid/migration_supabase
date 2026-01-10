-- Добавление колонки для общих файлов поставщика к офферу
ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS supplier_files jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN offers.supplier_files IS 'Общие файлы от поставщика к предложению [{name, url, type, size}]';

-- Добавление колонки для файлов к конкретной позиции оффера
ALTER TABLE offer_items 
ADD COLUMN IF NOT EXISTS item_files jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN offer_items.item_files IS 'Файлы к позиции товара [{name, url, type, size}]';

-- Миграция данных: перенос photo_url в item_files (если photo_url не пустой и item_files пустой)
UPDATE offer_items
SET item_files = jsonb_build_array(
    jsonb_build_object(
        'name', 'Фото',
        'url', photo_url,
        'type', 'image/jpeg' -- Предполагаем image, так как это photo_url
    )
)
WHERE photo_url IS NOT NULL 
  AND photo_url != '' 
  AND (item_files IS NULL OR item_files = '[]'::jsonb);
