import dynamic from "next/dynamic";
import React from "react";

const WrappedProviders = dynamic(() => import('../components/providers'), {ssr: false})

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
      <WrappedProviders>
        <Component {...pageProps} />
      </WrappedProviders>
    </SafeHydrate>
  );
}

export default MyApp;
