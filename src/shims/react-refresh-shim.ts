if (process.env.NODE_ENV !== 'production') {
  (global as any).$RefreshReg$ = () => {
    /* intentionally empty */
  };
  (global as any).$RefreshSig$ = () => (type: unknown) => type;
}
