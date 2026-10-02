-- AlterTable
ALTER TABLE `fornecedoras` ADD COLUMN `boas_vindas_em` DATETIME(3) NULL,
    ADD COLUMN `termos_aceitos_em` DATETIME(3) NULL,
    ADD COLUMN `termos_versao` VARCHAR(20) NULL,
    ADD COLUMN `usuario_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `candidaturas` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(160) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `telefone` VARCHAR(40) NOT NULL,
    `endereco` VARCHAR(255) NOT NULL,
    `cep` VARCHAR(15) NULL,
    `cidade` VARCHAR(100) NULL,
    `estado` VARCHAR(60) NULL,
    `etapa` ENUM('enviada', 'aprovada', 'acordo_aceito', 'efetivada', 'recusada') NOT NULL DEFAULT 'enviada',
    `observacao` TEXT NULL,
    `acordo_aceito_em` DATETIME(3) NULL,
    `acordo_versao` VARCHAR(20) NULL,
    `usuario_id` VARCHAR(191) NULL,
    `fornecedora_id` VARCHAR(191) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `candidaturas_usuario_id_key`(`usuario_id`),
    UNIQUE INDEX `candidaturas_fornecedora_id_key`(`fornecedora_id`),
    INDEX `candidaturas_etapa_idx`(`etapa`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pecas_propostas` (
    `id` VARCHAR(191) NOT NULL,
    `candidatura_id` VARCHAR(191) NULL,
    `fornecedora_id` VARCHAR(191) NULL,
    `descricao` TEXT NOT NULL,
    `foto` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(160) NULL,
    `tamanho` VARCHAR(20) NULL,
    `marca` VARCHAR(80) NULL,
    `genero` ENUM('masculino', 'feminino', 'unissex') NULL,
    `conservacao` ENUM('nova_com_etiqueta', 'seminova', 'com_marcas_de_uso') NULL,
    `categoria_id` VARCHAR(191) NULL,
    `situacao` ENUM('proposta', 'recusada', 'recebida') NOT NULL DEFAULT 'proposta',
    `peca_id` VARCHAR(191) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `pecas_propostas_peca_id_key`(`peca_id`),
    INDEX `pecas_propostas_candidatura_id_idx`(`candidatura_id`),
    INDEX `pecas_propostas_fornecedora_id_idx`(`fornecedora_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `fornecedoras_usuario_id_key` ON `fornecedoras`(`usuario_id`);

-- AddForeignKey
ALTER TABLE `fornecedoras` ADD CONSTRAINT `fornecedoras_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidaturas` ADD CONSTRAINT `candidaturas_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidaturas` ADD CONSTRAINT `candidaturas_fornecedora_id_fkey` FOREIGN KEY (`fornecedora_id`) REFERENCES `fornecedoras`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pecas_propostas` ADD CONSTRAINT `pecas_propostas_candidatura_id_fkey` FOREIGN KEY (`candidatura_id`) REFERENCES `candidaturas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pecas_propostas` ADD CONSTRAINT `pecas_propostas_fornecedora_id_fkey` FOREIGN KEY (`fornecedora_id`) REFERENCES `fornecedoras`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pecas_propostas` ADD CONSTRAINT `pecas_propostas_categoria_id_fkey` FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pecas_propostas` ADD CONSTRAINT `pecas_propostas_peca_id_fkey` FOREIGN KEY (`peca_id`) REFERENCES `pecas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
