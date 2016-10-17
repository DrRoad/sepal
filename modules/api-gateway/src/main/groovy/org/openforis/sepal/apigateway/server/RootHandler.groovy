package org.openforis.sepal.apigateway.server

import io.undertow.Handlers
import io.undertow.protocols.ssl.UndertowXnioSsl
import io.undertow.server.HttpHandler
import io.undertow.server.HttpServerExchange
import io.undertow.server.handlers.PathHandler
import io.undertow.server.handlers.ResponseCodeHandler
import io.undertow.server.handlers.proxy.LoadBalancingProxyClient
import io.undertow.server.session.InMemorySessionManager
import io.undertow.server.session.SessionAttachmentHandler
import io.undertow.server.session.SessionCookieConfig
import io.undertow.server.session.SessionManager
import org.apache.http.conn.ssl.TrustSelfSignedStrategy
import org.apache.http.ssl.SSLContextBuilder
import org.openforis.sepal.undertow.PatchedProxyHandler
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.xnio.OptionMap
import org.xnio.Xnio

class RootHandler implements HttpHandler {
    private static final int SESSION_TIMEOUT = 30 * 60 // 30 minutes
    private final int httpsPort
    private final String authenticationUrl
    private final PathHandler handler = Handlers.path()
    private final SessionManager sessionManager

    RootHandler(ProxyConfig config) {
        this.httpsPort = config.httpsPort
        this.authenticationUrl = config.authenticationUrl
        sessionManager = new InMemorySessionManager('sandbox-web-proxy', 1000, true)
        this.sessionManager.defaultSessionTimeout = SESSION_TIMEOUT
        handler.addExactPath(config.logoutPath, LogoutHandler.create())
    }

    RootHandler proxy(EndpointConfig endpointConfig) {
        def endpointHandler = new LoggingProxyHandler(endpointConfig)
        if (endpointConfig.authenticate)
            endpointHandler = new AuthenticatingHandler(authenticationUrl, endpointHandler)
        if (endpointConfig.https)
            endpointHandler = new HttpsRedirectHandler(httpsPort, endpointHandler)
        def sessionConfig = new SessionCookieConfig(cookieName: "SEPAL-SESSIONID", secure: endpointConfig.https)
        endpointHandler = new SessionAttachmentHandler(endpointHandler, sessionManager, sessionConfig)
        endpointConfig.prefix ?
                handler.addPrefixPath(endpointConfig.path, endpointHandler) :
                handler.addExactPath(endpointConfig.path, endpointHandler)
        return this
    }

    void handleRequest(HttpServerExchange exchange) throws Exception {
        exchange.requestHeaders.remove('sepal-user') // Prevent client from accessing as user without authenticating
        handler.handleRequest(exchange)
    }


    private static class LogoutHandler implements HttpHandler {
        private static final LOG = LoggerFactory.getLogger(this)

        void handleRequest(HttpServerExchange exchange) throws Exception {
            LOG.debug("Logging out: $exchange")
            exchange.requestCookies
                    .findAll { it.key.endsWith('SESSIONID') }
                    .collect { it.value }
                    .each {
                it.value = ''
                it.path = '/'
                it.maxAge = 0
                exchange.responseCookies[it.name] = it
            }
        }

        static HttpHandler create() {
            new LogoutHandler()
        }
    }


    private static class LoggingProxyHandler implements HttpHandler {
        private final Logger LOG = LoggerFactory.getLogger(LoggingProxyHandler)
        private final HttpHandler proxyHandler
        private final String target

        LoggingProxyHandler(EndpointConfig endpointConfig) {
            target = endpointConfig.target.toString().replaceAll('/$', '') // Remove trailing slashes
            def sslContext = new SSLContextBuilder()
                    .loadTrustMaterial(null, new TrustSelfSignedStrategy())
                    .build()
            def xnioSsl = new UndertowXnioSsl(Xnio.getInstance(), OptionMap.EMPTY, sslContext)
            def proxyClient = new LoadBalancingProxyClient()
            proxyClient.addHost(URI.create(target), xnioSsl)
            proxyHandler = new PatchedProxyHandler(
                    proxyClient,
                    ResponseCodeHandler.HANDLE_404
            )
            if (endpointConfig.rewriteRedirects)
                proxyHandler.clientResponseListener = new RedirectRewriter()
        }

        void handleRequest(HttpServerExchange exchange) throws Exception {
            LOG.info("Forwarding to $target: $exchange")
            proxyHandler.handleRequest(exchange)
        }
    }
}

