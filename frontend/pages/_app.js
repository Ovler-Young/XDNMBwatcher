import '../styles/globals.css'
import Head from 'next/head'
import "@fontsource/noto-sans-sc/500.css"
import { ChakraProvider } from "@chakra-ui/react"
import theme from "../utils/theme"
function MyApp({ Component, pageProps }) {
  return (
    <ChakraProvider theme={theme}>
      <Head>
        <title>Monitor</title>
      </Head>
      <Component {...pageProps} />
    </ChakraProvider>
  )
}
export default MyApp
