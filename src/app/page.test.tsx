import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import Home from "@/app/page";

test("renders the local demonstration and real entry points", () => {
  const html = renderToStaticMarkup(createElement(Home));

  expect(html).toContain("<h1");
  expect(html).toContain("Your next step</h1>");
  expect(html).toContain("Request an appointment</h2>");
  expect(html).toContain("Staff sign in</h2>");
  expect(html).toContain("Local workshop demonstration");
  expect(html).toContain('href="/request"');
  expect(html).toContain('href="/login"');
  expect(html).toContain("no live workshop service is offered");
});
