import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import Home from "@/app/page";

test("renders the public project status and its availability limits", () => {
  const html = renderToStaticMarkup(createElement(Home));

  expect(html).toContain("<h1");
  expect(html).toContain("Bayframe</h1>");
  expect(html).toContain("Project status</h2>");
  expect(html).toContain("In development");
  expect(html).toContain("does not accept bookings or hold customer records");
  expect(html).toContain("have not been implemented or verified");
});
