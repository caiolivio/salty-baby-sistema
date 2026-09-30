-- CreateTable
CREATE TABLE `sequencias` (
    `chave` VARCHAR(40) NOT NULL,
    `ultimo` INTEGER NOT NULL,

    PRIMARY KEY (`chave`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fornecedoras` (
    `id` VARCHAR(191) NOT NULL,
    `numero` INTEGER NOT NULL,
    `codigo` VARCHAR(10) NOT NULL,
    `nome` VARCHAR(160) NOT NULL,
    `telefone` VARCHAR(40) NULL,
    `email` VARCHAR(191) NULL,
    `documento` VARCHAR(30) NULL,
    `pix` VARCHAR(191) NULL,
    `endereco` VARCHAR(255) NULL,
    `cep` VARCHAR(15) NULL,
    `cidade` VARCHAR(100) NULL,
    `estado` VARCHAR(60) NULL,
    `pais` VARCHAR(60) NULL,
    `percentual_repasse_padrao` INTEGER NOT NULL DEFAULT 4000,
    `ativa` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `fornecedoras_numero_key`(`numero`),
    UNIQUE INDEX `fornecedoras_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pecas` (
    `id` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(20) NOT NULL,
    `codigo_antigo` VARCHAR(20) NULL,
    `nome` VARCHAR(160) NOT NULL,
    `tipo` ENUM('consignada', 'loja') NOT NULL,
    `fornecedora_id` VARCHAR(191) NULL,
    `percentual_repasse` INTEGER NULL,
    `preco_centavos` INTEGER NOT NULL,
    `custo_centavos` INTEGER NULL,
    `quantidade` INTEGER NOT NULL DEFAULT 1,
    `tamanho` VARCHAR(20) NULL,
    `genero` ENUM('masculino', 'feminino', 'unissex') NULL,
    `conservacao` ENUM('nova_com_etiqueta', 'seminova', 'com_marcas_de_uso') NULL,
    `variacao` VARCHAR(80) NULL,
    `marca` VARCHAR(80) NULL,
    `cor` VARCHAR(80) NULL,
    `categoria` VARCHAR(80) NULL,
    `medidas` VARCHAR(160) NULL,
    `descricao` TEXT NULL,
    `status` ENUM('rascunho', 'publicada', 'reservada', 'vendida', 'na_sacolinha', 'enviada', 'retirada', 'devolvida', 'doada', 'baixa') NOT NULL DEFAULT 'rascunho',
    `data_entrada` DATE NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pecas_codigo_key`(`codigo`),
    INDEX `pecas_codigo_antigo_idx`(`codigo_antigo`),
    INDEX `pecas_status_idx`(`status`),
    INDEX `pecas_fornecedora_id_idx`(`fornecedora_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fotos_pecas` (
    `id` VARCHAR(191) NOT NULL,
    `peca_id` VARCHAR(191) NOT NULL,
    `arquivo` VARCHAR(191) NOT NULL,
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fotos_pecas_peca_id_ordem_idx`(`peca_id`, `ordem`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clientes` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(160) NOT NULL,
    `telefone` VARCHAR(40) NULL,
    `email` VARCHAR(191) NULL,
    `cpf` VARCHAR(20) NULL,
    `endereco` VARCHAR(255) NULL,
    `cep` VARCHAR(15) NULL,
    `cidade` VARCHAR(100) NULL,
    `estado` VARCHAR(60) NULL,
    `pais` VARCHAR(60) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendas` (
    `id` VARCHAR(191) NOT NULL,
    `data` DATE NOT NULL,
    `cliente_id` VARCHAR(191) NULL,
    `canal` ENUM('site', 'whatsapp_privado', 'grupo_whatsapp', 'instagram', 'loja', 'bag') NOT NULL,
    `forma_pagamento` ENUM('pix', 'cartao', 'dinheiro', 'credito_fornecedora') NULL,
    `subtotal_centavos` INTEGER NOT NULL,
    `desconto_centavos` INTEGER NOT NULL DEFAULT 0,
    `total_centavos` INTEGER NOT NULL,
    `origem` VARCHAR(191) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `vendas_data_idx`(`data`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `itens_venda` (
    `id` VARCHAR(191) NOT NULL,
    `venda_id` VARCHAR(191) NOT NULL,
    `peca_id` VARCHAR(191) NOT NULL,
    `quantidade` INTEGER NOT NULL DEFAULT 1,
    `preco_unitario_centavos` INTEGER NOT NULL,
    `desconto_centavos` INTEGER NOT NULL DEFAULT 0,
    `valor_pago_centavos` INTEGER NOT NULL,
    `percentual_repasse` INTEGER NULL,
    `repasse_centavos` INTEGER NOT NULL,
    `custo_centavos` INTEGER NULL,
    `lucro_centavos` INTEGER NOT NULL,
    `repasse_recebido` BOOLEAN NOT NULL DEFAULT false,
    `repasse_recebido_em` DATE NULL,

    INDEX `itens_venda_venda_id_idx`(`venda_id`),
    INDEX `itens_venda_peca_id_idx`(`peca_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pecas` ADD CONSTRAINT `pecas_fornecedora_id_fkey` FOREIGN KEY (`fornecedora_id`) REFERENCES `fornecedoras`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fotos_pecas` ADD CONSTRAINT `fotos_pecas_peca_id_fkey` FOREIGN KEY (`peca_id`) REFERENCES `pecas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendas` ADD CONSTRAINT `vendas_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itens_venda` ADD CONSTRAINT `itens_venda_venda_id_fkey` FOREIGN KEY (`venda_id`) REFERENCES `vendas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itens_venda` ADD CONSTRAINT `itens_venda_peca_id_fkey` FOREIGN KEY (`peca_id`) REFERENCES `pecas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
