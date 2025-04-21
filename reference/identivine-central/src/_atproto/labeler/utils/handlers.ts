import { type WebsocketHandler } from "@fastify/websocket";
import {
  type RawReplyDefaultExpression,
  type RawRequestDefaultExpression,
  type RawServerDefault,
  type RequestGenericInterface,
  type RouteGenericInterface,
  type RouteHandlerMethod,
} from "fastify";

export type QueryHandler<
  T extends
    RouteGenericInterface["Querystring"] = RouteGenericInterface["Querystring"],
> = RouteHandlerMethod<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  { Querystring: T }
>;

export type ProcedureHandler<
  T extends RouteGenericInterface["Body"] = RouteGenericInterface["Body"],
> = RouteHandlerMethod<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  { Body: T }
>;
export type SubscriptionHandler<
  T extends
    RequestGenericInterface["Querystring"] = RequestGenericInterface["Querystring"],
> = WebsocketHandler<
  RawServerDefault,
  RawRequestDefaultExpression,
  { Querystring: T }
>;
