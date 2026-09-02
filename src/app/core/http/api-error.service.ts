import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { ApiProblemDetail } from './api-problem-detail.model';

const FRIENDLY_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email ou senha inválidos.',
  EMAIL_ALREADY_REGISTERED: 'Já existe uma conta cadastrada com este email.',
  VALIDATION_FAILED: 'Verifique os dados informados.',
  UNAUTHENTICATED: 'Sua sessão não está autenticada.',
  CSRF_VALIDATION_FAILED: 'Não foi possível validar a requisição. Tente novamente.',
  SUBSCRIPTION_ALREADY_EXISTS: 'Você já possui um alerta para este servidor.',
  UNKNOWN_MAP: 'Um dos mapas selecionados não está mais disponível.',
  DUPLICATE_RULE_TYPE: 'A configuração contém condições duplicadas.',
  DUPLICATE_CHANNEL_TYPE: 'A configuração contém canais duplicados.',
  NO_ACTIVE_NOTIFICATION_CHANNEL: 'Ative pelo menos um canal de notificação.',
  INVALID_RULE_PARAMETERS: 'Uma das condições configuradas é inválida.',
  INVALID_RULE_CONFIGURATION: 'Uma das condições configuradas é inválida.',
  INVALID_CHANNEL_CONFIGURATION: 'A configuração de notificação é inválida.',
  EXTERNAL_PROVIDER_UNAVAILABLE: 'Não foi possível consultar os servidores agora. Tente novamente.',
  INTERNAL_ERROR: 'Ocorreu um erro inesperado. Tente novamente.',
};

const GENERIC_ERROR_MESSAGE = 'Não foi possível concluir a operação.';

@Injectable({ providedIn: 'root' })
export class ApiErrorService {
  toProblemDetail(error: unknown): ApiProblemDetail {
    if (this.isHttpErrorResponse(error) && this.isProblemDetail(error.error)) {
      return {
        ...error.error,
        status: error.error.status ?? error.status,
      };
    }

    if (this.isProblemDetail(error)) {
      return {
        ...error,
        status: error.status ?? 0,
      };
    }

    if (this.isHttpErrorResponse(error)) {
      return { status: error.status };
    }

    return { status: 0 };
  }

  messageFor(error: unknown): string {
    const problemDetail = this.toProblemDetail(error);
    const errorCode = problemDetail.errorCode ?? problemDetail.code;

    if (errorCode && FRIENDLY_MESSAGES[errorCode]) {
      return FRIENDLY_MESSAGES[errorCode];
    }

    if (problemDetail.status === 0) {
      return 'Não foi possível conectar ao servidor. Tente novamente.';
    }

    return GENERIC_ERROR_MESSAGE;
  }

  fieldMessageFor(error: unknown, field: string): string | null {
    const fieldError = this.toProblemDetail(error).fieldErrors?.find(
      (candidate) => candidate.field === field,
    );

    return fieldError?.message ?? null;
  }

  private isHttpErrorResponse(error: unknown): error is HttpErrorResponse {
    return error instanceof HttpErrorResponse;
  }

  private isProblemDetail(error: unknown): error is ApiProblemDetail {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const candidate = error as Record<string, unknown>;
    const fieldErrors = candidate['fieldErrors'];

    return (
      typeof candidate['errorCode'] === 'string' ||
      typeof candidate['code'] === 'string' ||
      typeof candidate['detail'] === 'string' ||
      Array.isArray(fieldErrors)
    );
  }
}
