#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/13bc23f04d83aee0ffaf086d0c3e57b8ce1eccebd66cbd5340a7b475a905115a/contract';
import endContract from '../../snapshots/13bc23f04d83aee0ffaf086d0c3e57b8ce1eccebd66cbd5340a7b475a905115a/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/6ecaaa927964fbb0e4311de5f6be6d2bc0cb395e6426a85953b4a1384016d56f/contract';
import startContract from '../../snapshots/6ecaaa927964fbb0e4311de5f6be6d2bc0cb395e6426a85953b4a1384016d56f/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addCheckConstraint({
        schema: 'public',
        table: 'aiProvider',
        constraint: 'aiProvider_type_check_03ab690d',
        expression: "\"type\" IN ('OPENAI', 'ANTHROPIC', 'GEMINI')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'apiUsageLog',
        constraint: 'apiUsageLog_operation_check_f974256c',
        expression: "\"operation\" IN ('CHAT', 'SEARCH')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'apiUsageLog',
        constraint: 'apiUsageLog_status_check_c68c3ebe',
        expression: "\"status\" IN ('SUCCESS', 'FAILED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'message',
        constraint: 'message_role_check_66a272d0',
        expression: "\"role\" IN ('SYSTEM', 'USER', 'ASSISTANT')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'subscription',
        constraint: 'subscription_plan_check_c89db803',
        expression: "\"plan\" IN ('FREE', 'PREMIUM')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'subscription',
        constraint: 'subscription_status_check_8a00ac15',
        expression: "\"status\" IN ('ACTIVE', 'CANCELED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'user',
        constraint: 'user_status_check_1527ac15',
        expression: "\"status\" IN ('ACTIVE', 'SUSPENDED')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
