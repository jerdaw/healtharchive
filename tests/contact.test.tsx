import { render, screen } from "@testing-library/react";

import ContactPage from "@/app/contact/page";

describe("/contact", () => {
    it("shows the configured email addresses", () => {
        render(<ContactPage />);

        const primary = screen.getByRole("link", {
            name: "contact@healtharchive.ca",
        });
        expect(primary).toHaveAttribute(
            "href",
            "mailto:contact@healtharchive.ca"
        );
    });
});
