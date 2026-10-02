-- AlterTable
ALTER TABLE `usuarios` ADD COLUMN `whatsapp` VARCHAR(20) NULL;

-- CreateTable
CREATE TABLE `permissoes_equipe` (
    `usuario_id` VARCHAR(191) NOT NULL,
    `chave` VARCHAR(40) NOT NULL,
    `nivel` VARCHAR(10) NOT NULL,

    PRIMARY KEY (`usuario_id`, `chave`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `permissoes_equipe` ADD CONSTRAINT `permissoes_equipe_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Quem já era ajudante continua com o mesmo acesso de antes.
INSERT INTO `permissoes_equipe` (`usuario_id`, `chave`, `nivel`)
SELECT p.`usuario_id`, c.`chave`, c.`nivel`
FROM `usuario_perfis` p
CROSS JOIN (
  SELECT 'pecas' AS `chave`, 'alterar' AS `nivel`
  UNION ALL SELECT 'marketing', 'alterar'
  UNION ALL SELECT 'fornecedoras', 'ver'
  UNION ALL SELECT 'devolucoes', 'alterar'
  UNION ALL SELECT 'pedidos', 'alterar'
  UNION ALL SELECT 'clientes', 'alterar'
) c
WHERE p.`perfil` = 'ajudante';
