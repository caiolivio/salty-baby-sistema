-- CreateTable
CREATE TABLE `categorias` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(60) NOT NULL,
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `ativa` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `categorias_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pecas_categorias` (
    `peca_id` VARCHAR(191) NOT NULL,
    `categoria_id` VARCHAR(191) NOT NULL,

    INDEX `pecas_categorias_categoria_id_idx`(`categoria_id`),
    PRIMARY KEY (`peca_id`, `categoria_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pecas_categorias` ADD CONSTRAINT `pecas_categorias_peca_id_fkey` FOREIGN KEY (`peca_id`) REFERENCES `pecas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pecas_categorias` ADD CONSTRAINT `pecas_categorias_categoria_id_fkey` FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Categorias iniciais, escolhidas pelo Caio (30/09/2026). Novas entram pelo painel.
INSERT INTO `categorias` (`id`, `nome`, `ordem`) VALUES
    ('cat_roupas', 'Roupas', 1),
    ('cat_calcados', 'Calçados', 2),
    ('cat_fantasias', 'Fantasias', 3),
    ('cat_brinquedos', 'Brinquedos', 4),
    ('cat_livros', 'Livros', 5),
    ('cat_acessorios', 'Acessórios', 6),
    ('cat_utilitarios', 'Utilitários', 7),
    ('cat_acessorios_carro', 'Acessórios para carro', 8),
    ('cat_acessorios_bebe', 'Acessórios de bebê', 9);
