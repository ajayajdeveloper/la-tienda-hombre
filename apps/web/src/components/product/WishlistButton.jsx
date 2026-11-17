import { useDispatch, useSelector } from 'react-redux'
import { selectIsWishlisted, toggleWishlist } from '../../store/wishlistSlice.js'
import { showToast } from '../../store/uiSlice.js'
import Icon from '../ui/Icon.jsx'
import styles from './WishlistButton.module.css'

export default function WishlistButton({ productId, name, variant = 'floating' }) {
  const dispatch = useDispatch()
  const active = useSelector(selectIsWishlisted(productId))

  function handleClick(event) {
    // The button sits inside a card that is a link; don't navigate.
    event.preventDefault()
    event.stopPropagation()
    dispatch(toggleWishlist(productId))
    dispatch(showToast(active ? 'Removed from wishlist' : 'Saved to wishlist'))
  }

  return (
    <button
      type="button"
      className={`${styles.button} ${styles[variant]}`}
      data-active={active}
      aria-pressed={active}
      aria-label={active ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      onClick={handleClick}
    >
      <Icon name="heart" size={variant === 'floating' ? 18 : 20} filled={active} />
      {variant === 'full' && <span>{active ? 'Saved' : 'Wishlist'}</span>}
    </button>
  )
}
