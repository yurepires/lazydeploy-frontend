export interface ApiFieldError {
  readonly field: string;
  readonly message: string;
}

export interface ApiProblemDetail {
  readonly type?: string;
  readonly title?: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly errorCode?: string;
  readonly code?: string;
  readonly fieldErrors?: ApiFieldError[];
}
