#!/usr/bin/env -S bun
import type { Contract as Start } from '../../snapshots/7309e0107c8ae40aefcb179f4e003bf8de5a756d049edcb93b405d03a4f916f9/contract';
import startContract from '../../snapshots/7309e0107c8ae40aefcb179f4e003bf8de5a756d049edcb93b405d03a4f916f9/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/cea8ec2f6761f83265418f8a3b047f8da06a1b31a368a07771d222c1d901d9ec/contract';
import endContract from '../../snapshots/cea8ec2f6761f83265418f8a3b047f8da06a1b31a368a07771d222c1d901d9ec/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      ...this.renameTable({ schema: 'public', table: 'aiProvider', to: 'ai_provider' }),
      ...this.renameTable({ schema: 'public', table: 'apiUsageLog', to: 'api_usage_log' }),
      ...this.renameTable({ schema: 'public', table: 'messageSource', to: 'message_source' }),
      ...this.renameTable({ schema: 'public', table: 'webSearch', to: 'web_search' }),
      ...this.renameTable({ schema: 'public', table: 'searchResult', to: 'search_result' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
