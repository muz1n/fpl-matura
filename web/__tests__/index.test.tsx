import { render, screen } from '@testing-library/react'
import Home from '../pages/index'

test('renders demo links', () => {
    render(<Home />)
    expect(screen.getByText(/FPL Assistent/i)).toBeInTheDocument()
    // Check presence of at least one Prognosen Link
    const links = screen.getAllByRole('link', { name: /Prognosen/i })
    expect(links.length).toBeGreaterThan(0)
})
