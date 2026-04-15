# Accessibility Statement

HealthArchive.ca is committed to ensuring digital accessibility for all users, including those with disabilities. We aim to provide equal access to critical health information for everyone.

## Conformance Status

**Target: WCAG 2.1 Level AA Conformance**

We are actively working towards full conformance with the [Web Content Accessibility Guidelines (WCAG) 2.1](https://www.w3.org/TR/WCAG21/) Level AA. This standard helps make web content more accessible to users with disabilities, including blindness and low vision, deafness and hearing loss, learning disabilities, cognitive limitations, limited movement, speech disabilities, photosensitivity, and combinations of these.

## Accessibility Features

### Current Implementation

HealthArchive.ca includes the following accessibility features:

#### **Keyboard Navigation**

- All interactive elements are accessible via keyboard
- Skip to main content link for keyboard users
- Logical tab order throughout the site
- Visible focus indicators on all interactive elements

#### **Screen Reader Support**

- Semantic HTML structure with proper heading hierarchy (h1-h6)
- ARIA labels and roles where appropriate
- Alt text for all meaningful images
- Descriptive link text

#### **Visual Design**

- Sufficient color contrast ratios (WCAG AA compliant)
- Text resizing support up to 200% without loss of functionality
- Dark mode option to reduce eye strain
- No flashing or strobing content

#### **Language Support**

- Bilingual interface (English and French)
- Language attribute properly set on all pages
- French translation banner with explanation (alpha automated translation)

#### **Responsive Design**

- Mobile-friendly, works on all device sizes
- Touch target sizes meet minimum requirements
- Zoom and text resize compatible

## Automated Testing

We use automated accessibility testing tools to catch common issues:

- **vitest-axe**: Runs axe-core accessibility tests on all major pages
- **eslint-plugin-jsx-a11y**: Lints React components for accessibility issues during development
- **Continuous Integration**: Accessibility checks run on every code change

### Tested Pages

Automated a11y tests cover:

- Home page
- Archive/search interface
- Snapshot viewer
- About page
- Methods page
- Contact page
- Researchers page

## Known Limitations

### Current Issues

1. **Archived Content**: Snapshots of external websites may not meet accessibility standards, as we preserve content as originally published. The viewer interface itself is accessible.

2. **Complex Visualizations**: Some data visualizations may have limited screen reader support. We're working on improving text alternatives.

3. **French Translation**: French content is currently alpha quality automated translation. Screen reader pronunciation may vary.

## Testing Methodology

Our accessibility testing includes:

1. **Automated Testing**
   - axe-core accessibility engine
   - ESLint a11y linting
   - Continuous integration checks

2. **Manual Testing**
   - Keyboard navigation testing
   - Screen reader testing (NVDA, JAWS, VoiceOver)
   - Color contrast verification
   - Zoom and text resize testing

3. **User Testing**
   - Planned user testing with assistive technology users
   - Feedback integration from accessibility community

## Roadmap

### Planned Improvements

- [ ] Formal accessibility audit by external experts
- [ ] User testing with screen reader users
- [ ] Enhanced keyboard shortcuts documentation
- [ ] ARIA live regions for dynamic content updates
- [ ] Comprehensive accessibility documentation
- [ ] Regular accessibility training for contributors

## Feedback and Support

We welcome feedback on the accessibility of HealthArchive.ca. If you encounter accessibility barriers:

### Report an Issue

**Email**: [accessibility@healtharchive.ca](mailto:accessibility@healtharchive.ca)

Please include:

- URL of the page with the issue
- Description of the problem
- Assistive technology you're using (if applicable)
- Browser and operating system

We aim to respond to accessibility feedback within 2 business days and resolve issues based on severity.

### Alternative Formats

If you need content in an alternative format (large print, audio, etc.), please contact us. We'll work to provide the information in a format that meets your needs.

## Standards and Guidelines

We follow these accessibility standards and guidelines:

- **WCAG 2.1 Level AA**: Primary conformance target
- **ARIA Authoring Practices**: For interactive components
- **Section 508**: U.S. federal accessibility requirements
- **AODA**: Accessibility for Ontarians with Disabilities Act (where applicable)

## Technical Specifications

### Compatibility

HealthArchive.ca works with:

**Browsers:**

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

**Screen Readers:**

- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS/iOS)
- TalkBack (Android)

**Assistive Technologies:**

- Keyboard-only navigation
- Voice control software
- Screen magnification
- High contrast modes

### Technologies

This site uses:

- HTML5 (semantic markup)
- WAI-ARIA (when semantic HTML is insufficient)
- CSS3 (for visual presentation)
- JavaScript (progressively enhanced)

JavaScript is required for some functionality, but core content remains accessible without it.

## Legal and Compliance

This accessibility statement was last updated on **February 13, 2026**.

HealthArchive.ca is an independent project and is not affiliated with any government agency. We voluntarily commit to accessibility best practices to ensure equitable access to archived health information.

## Additional Resources

- [Web Content Accessibility Guidelines (WCAG) 2.1](https://www.w3.org/TR/WCAG21/)
- [WebAIM Screen Reader Testing Guide](https://webaim.org/articles/screenreader_testing/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

---

**Questions or suggestions?** Contact us at [contact@healtharchive.ca](mailto:contact@healtharchive.ca)
