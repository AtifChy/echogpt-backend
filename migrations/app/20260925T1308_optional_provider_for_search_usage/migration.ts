#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/13bc23f04d83aee0ffaf086d0c3e57b8ce1eccebd66cbd5340a7b475a905115a/contract';
import startContract from '../../snapshots/13bc23f04d83aee0ffaf086d0c3e57b8ce1eccebd66cbd5340a7b475a905115a/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/8e72bd9ac12e9a6de629228bcc6f510d456f82cc3a292eb329428bf4819b8eed/contract';
import endContract from '../../snapshots/8e72bd9ac12e9a6de629228bcc6f510d456f82cc3a292eb329428bf4819b8eed/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [this.dropNotNull({ schema: 'public', table: 'apiUsageLog', column: 'providerId' })];
  }
}

MigrationCLI.run(import.meta.url, M);
