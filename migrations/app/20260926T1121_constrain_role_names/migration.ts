#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/8e72bd9ac12e9a6de629228bcc6f510d456f82cc3a292eb329428bf4819b8eed/contract';
import startContract from '../../snapshots/8e72bd9ac12e9a6de629228bcc6f510d456f82cc3a292eb329428bf4819b8eed/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f36d4242b377c536fa40b7aad9c51ba33bbd995d8697fe5ce1e6fbcac8096f3e/contract';
import endContract from '../../snapshots/f36d4242b377c536fa40b7aad9c51ba33bbd995d8697fe5ce1e6fbcac8096f3e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addCheckConstraint({
        schema: 'public',
        table: 'role',
        constraint: 'role_name_check_f0513a97',
        expression: "\"name\" IN ('ADMIN', 'USER')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
