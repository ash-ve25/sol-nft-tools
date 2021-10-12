import React from "react";
import Providers from "../components/providers";

function SafeHydrate({ children }) {
  return (
    <div suppressHydrationWarning>
      {typeof window === "undefined" || typeof location === "undefined"
        ? null
        : children}
    </div>
  );
}

function MyApp({ Component, pageProps }) {
  return (
    <SafeHydrate>
      <Providers>
        <Component {...pageProps} />
      </Providers>
    </SafeHydrate>
  );
}

export default MyApp;
