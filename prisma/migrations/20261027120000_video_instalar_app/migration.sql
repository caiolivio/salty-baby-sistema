-- Link do vídeo que ensina a instalar o app (YouTube não listado, Google Drive...), em Configurações.
ALTER TABLE `configuracao_loja` ADD COLUMN `video_instalar_app` VARCHAR(300) NULL;

-- O vídeo que o Caio mandou em 27/10/2026 (Google Drive). Dá para trocar em Configurações.
UPDATE `configuracao_loja`
SET `video_instalar_app` = 'https://drive.google.com/file/d/1k4PwJL9zMnuyLN-QHyOhxMushUwIQ30R/view'
WHERE `id` = 1 AND `video_instalar_app` IS NULL;
