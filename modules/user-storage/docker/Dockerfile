FROM node:14-stretch
# EXPOSE 5001

ENV MODULE /usr/local/src/sepal/modules/user-storage/docker
ENV SHARED /usr/local/src/sepal/lib/js/shared

ADD build/lib/js/shared ${SHARED}
WORKDIR ${SHARED}/js/shared
USER root
RUN chown -R node: ${SHARED}
USER node
RUN npm install

ADD package.json ${MODULE}/
WORKDIR ${MODULE}
USER root
RUN mkdir src && chown -R node: ${MODULE}
USER node
RUN npm install

ADD src ${MODULE}/src
CMD node \
    src/main.js
# --gee-email "$EE_ACCOUNT_SEPAL_ENV" \
# --gee-key "$EE_PRIVATE_KEY_SEPAL_ENV" \
# --sepal-host "$SEPAL_HOST_SEPAL_ENV" \
# --sepal-username "sepalAdmin" \
# --sepal-password "$SEPAL_ADMIN_PASSWORD_SEPAL_ENV"
