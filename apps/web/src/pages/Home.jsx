import Hero from '../components/home/Hero.jsx'
import {
  CategoryTiles, CollectionTiles, NewArrivals, OfferBanner, PromiseStrip, RecentlyViewed, TabbedBestsellers,
} from '../components/home/HomeSections.jsx'
import styles from './Home.module.css'

export default function Home() {
  return (
    <div className={styles.home}>
      <div>
        <Hero />
        <PromiseStrip />
      </div>
      <CategoryTiles />
      <TabbedBestsellers />
      <CollectionTiles />
      <OfferBanner />
      <NewArrivals />
      <div className="container">
        <RecentlyViewed />
      </div>
    </div>
  )
}
