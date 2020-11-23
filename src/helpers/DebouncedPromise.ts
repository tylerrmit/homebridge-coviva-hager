export class DebouncedPromise<PromiseReturnType> {
  public resolve!: (value?: PromiseReturnType | undefined) => void;
  public reject!: (reason?: Error) => void;
  public promise: Promise<PromiseReturnType>;

  constructor() {
    this.promise = new Promise<PromiseReturnType>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}
