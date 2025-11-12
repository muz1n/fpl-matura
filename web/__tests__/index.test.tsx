import { render, screen } from '@testing-library/react'
import Home from '../pages/index'

test('renders demo links', () => {
    render(<Home />)
    expect(screen.getByText(/FPL Matura/i)).toBeInTheDocument()
    expect(screen.getByText('/demo/predictions_gw38.json')).toBeInTheDocument()
})
