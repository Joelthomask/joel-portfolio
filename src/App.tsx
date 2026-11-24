import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Menu, X, ArrowUpRight, Github, Linkedin, Mail, Search, LayoutGrid, List, Globe, Cpu, Monitor, Database, MoreHorizontal, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, CalendarDays, Layers, UserRound, Check } from 'lucide-react'
import { projects, technologies, siteContent, aboutContent, contactContent } from './data/portfolio'
import SectionLabel from './components/SectionLabel'
import MountainExperience from './components/MountainExperience'

const navItems = ['Home', 'Work', 'About', 'Contact']

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const smooth = (t: number) => t * t * t * (t * (t * 6 - 15) + 10) // smootherstep: very gentle in and out

/* Cinematic, scroll-scrubbed reveals.
   Progress for a section runs from the moment the centre of the PREVIOUS section is in
   the middle of the screen to the moment the centre of THIS section is. It is scrubbed
   by scroll position (so it reverses going up and is complete after a navbar jump) and
   eased every frame so it glides instead of stepping with the wheel. */
const EASE_RATE = 4.5 // higher = tracks the scroll more tightly, lower = floatier glide

function useScrubReveal<T extends HTMLElement>(setup: (section: T) => (p: number) => void, easeRate = EASE_RATE) {
  const ref = useRef<T>(null)
  useLayoutEffect(() => {
    const section = ref.current
    if (!section) return
    const prev = section.previousElementSibling as HTMLElement | null
    const paint = setup(section)
    let raf = 0
    let current = -1 // -1 = not initialised, snap on first frame
    let last = 0

    const target = () => {
      const vh = window.innerHeight
      const y = window.scrollY
      const pr = prev?.getBoundingClientRect()
      const prevCenterY = pr ? pr.top + y + pr.height / 2 : vh / 2
      const r = section.getBoundingClientRect()
      const start = prevCenterY - vh / 2
      // Finishes exactly when this section is centred in the viewport (not a pixel earlier).
      const end = Math.max(start + 1, r.top + y + r.height / 2 - vh / 2)
      return clamp01((y - start) / (end - start))
    }

    const tick = (now = performance.now()) => {
      const t = target()
      const dt = Math.min(0.05, (now - (last || now - 16)) / 1000)
      last = now
      if (current < 0) current = t
      current += (t - current) * (1 - Math.exp(-easeRate * dt)) // frame-rate independent inertia
      if (Math.abs(t - current) < 0.0004) { current = t; last = 0 }
      paint(current)
      raf = current === t ? 0 : requestAnimationFrame(tick)
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(tick) }

    tick()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
  return ref
}

/* Work: heading fades up, filters follow, then the three cards slide in together from the left. */
function useWorkScrollReveal() {
  return useScrubReveal<HTMLElement>((section) => {
    const head = section.querySelector<HTMLElement>('.section-heading')
    const filters = section.querySelector<HTMLElement>('.work-filters')
    const cards = section.querySelector<HTMLElement>('.project-grid')
    return (p) => {
      const tHead = smooth(clamp01(p / 0.55))
      const tFilters = smooth(clamp01((p - 0.12) / 0.55))
      const tCards = smooth(clamp01((p - 0.35) / 0.65))
      if (head) { head.style.opacity = String(tHead); head.style.transform = `translateY(${(1 - tHead) * 48}px)` }
      if (filters) { filters.style.opacity = String(tFilters); filters.style.transform = `translateY(${(1 - tFilters) * 40}px)` }
      if (cards) { cards.style.opacity = String(tCards); cards.style.transform = `translateX(${(1 - tCards) * -220}px)` }
    }
  })
}

/* Toolkit: heading fades up, then the tiles arrive row by row, alternating from the left
   (row 1), the right (row 2), the left (row 3)... Rows are detected from the real layout,
   so it adapts to however many columns the screen shows. */
function useToolkitScrollReveal() {
  return useScrubReveal<HTMLElement>((section) => {
    const head = section.querySelector<HTMLElement>('.section-heading')
    const items = Array.from(section.querySelectorAll<HTMLElement>('.tech-item'))
    let rowOf: number[] = []
    let rowCount = 1
    const measureRows = () => {
      const tops: number[] = []
      rowOf = items.map((el) => {
        const t = el.offsetTop
        let i = tops.findIndex((v) => Math.abs(v - t) < 4)
        if (i < 0) { tops.push(t); i = tops.length - 1 }
        return i
      })
      rowCount = Math.max(1, tops.length)
    }
    measureRows()
    window.addEventListener('resize', measureRows)

    return (p) => {
      const tHead = smooth(clamp01(p / 0.4))
      if (head) { head.style.opacity = String(tHead); head.style.transform = `translateY(${(1 - tHead) * 48}px)` }
      const span = 0.4 // share of the scroll each row takes
      const gap = rowCount > 1 ? (1 - 0.2 - span) / (rowCount - 1) : 0
      items.forEach((el, i) => {
        const row = rowOf[i] ?? 0
        const t = smooth(clamp01((p - 0.2 - row * gap) / span))
        const dir = row % 2 === 0 ? -1 : 1
        if (t >= 1) {
          // finished: hand control back to CSS so hover effects work
          el.style.opacity = ''; el.style.transform = ''; el.style.transition = ''
        } else {
          el.style.transition = 'none'
          el.style.opacity = String(t)
          el.style.transform = `translateX(${(1 - t) * dir * 260}px)`
        }
      })
    }
  }, 1.8) // slower, floatier tracking for the Toolkit reveal only
}


function MobileExperienceNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 700px), (pointer: coarse)")
    setVisible(mobileQuery.matches)
  }, [])

  if (!visible) return null


  return (
    <div className="mobile-experience-backdrop" role="presentation">
      <section
        className="mobile-experience-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-experience-title"
        aria-describedby="mobile-experience-description"
      >
        <button
          className="mobile-experience-close"
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Close message"
        >
          <X size={18} />
        </button>
        <span className="mobile-experience-kicker">A better way to explore</span>
        <h2 id="mobile-experience-title">View on PC for the best experience.</h2>
        <p id="mobile-experience-description">
          This portfolio is designed for a larger screen. Open it on a desktop
          to experience the full mountain parallax, sunlight effects and animations.
        </p>
        <button
          className="button button-primary mobile-experience-continue"
          type="button"
          onClick={() => setVisible(false)}
        >
          Continue on mobile <ArrowUpRight size={15} />
        </button>
      </section>
    </div>
  )
}


function ProjectScrollArea({ className, label, children }: { className: string; label: string; children: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [hasMore, setHasMore] = useState(false)
  const [canScrollUp, setCanScrollUp] = useState(false)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const update = () => {
      setHasMore(viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop > 3)
      setCanScrollUp(viewport.scrollTop > 3)
    }
    update()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    observer?.observe(viewport)
    if (viewport.firstElementChild) observer?.observe(viewport.firstElementChild)
    window.addEventListener('resize', update)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [children])

  const scroll = () => {
    const viewport = viewportRef.current
    if (!viewport) return
    viewport.scrollBy({ top: Math.max(120, viewport.clientHeight * 0.72), behavior: 'smooth' })
  }

  return (
    <div className={`project-scroll-area ${className}`}>
      <div
        ref={viewportRef}
        className="project-scroll-viewport"
        role="region"
        aria-label={label}
        tabIndex={0}
        onScroll={(event) => {
          const el = event.currentTarget
          setHasMore(el.scrollHeight - el.clientHeight - el.scrollTop > 3)
          setCanScrollUp(el.scrollTop > 3)
        }}
      >
        {children}
      </div>
      {hasMore && <button type="button" className="project-scroll-cue" onClick={scroll} aria-label={`Scroll down ${label}`}>
        <ChevronDown size={17} />
      </button>}
      {canScrollUp && <button type="button" className="project-scroll-cue up" onClick={() => viewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} aria-label={`Scroll to top of ${label}`}>
        <ChevronDown size={17} />
      </button>}
    </div>
  )
}

function ProjectDetailModal({ project, onClose }: { project: (typeof projects)[number]; onClose: () => void }) {
  const gallery = (project.images?.length ? project.images : project.image ? [project.image] : []).filter(Boolean)
  const [activeImage, setActiveImage] = useState(0)
  const [expandedImage, setExpandedImage] = useState(false)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { if (expandedImage) setExpandedImage(false); else onClose() }
      if (event.key === 'ArrowRight' && gallery.length > 1) setActiveImage((value) => (value + 1) % gallery.length)
      if (event.key === 'ArrowLeft' && gallery.length > 1) setActiveImage((value) => (value - 1 + gallery.length) % gallery.length)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose, gallery.length, expandedImage])

  const hasLiveDemo = Boolean(project.showLiveDemo && project.liveDemoUrl)
  const hasSource = Boolean(project.sourceCodeUrl)
  const features = project.features ?? []

  return (
    <div className="project-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="project-modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
        <button className="project-modal-close" type="button" onClick={onClose} aria-label="Close project details"><X size={20} /></button>
        <div className="project-modal-gallery">
          <div className="project-modal-main-image">
            {gallery[activeImage] ? <button className="project-image-open" type="button" onClick={() => setExpandedImage(true)} aria-label="View image at original proportions"><img src={gallery[activeImage]} alt={`${project.title} screenshot ${activeImage + 1}`} /></button> : <div className="project-modal-image-placeholder"><Layers size={46} /><span>PROJECT PREVIEW</span></div>}
            {gallery.length > 1 && <>
              <button className="project-gallery-arrow previous" type="button" onClick={() => setActiveImage((value) => (value - 1 + gallery.length) % gallery.length)} aria-label="Previous image"><ChevronLeft size={20} /></button>
              <button className="project-gallery-arrow next" type="button" onClick={() => setActiveImage((value) => (value + 1) % gallery.length)} aria-label="Next image"><ChevronRight size={20} /></button>
            </>}
          </div>
          {gallery.length > 1 && <div className="project-modal-thumbnails">
            {gallery.map((image, index) => <button type="button" key={`${image}-${index}`} className={activeImage === index ? 'active' : ''} onClick={() => setActiveImage(index)} aria-label={`Show image ${index + 1}`}><img src={image} alt="" /></button>)}
          </div>}
          {gallery.length > 0 && <div className="project-gallery-count">{String(activeImage + 1).padStart(2, '0')} <span>/</span> {String(gallery.length).padStart(2, '0')}</div>}
        </div>
        <div className="project-modal-content">
          <div className="project-modal-kicker"><span className="project-modal-kicker-icon"><Layers size={14} /></span>{project.projectType || 'PROJECT'}</div>
          <h2 id="project-modal-title">{project.title}</h2>
          {project.category && <p className="project-modal-category">{project.category}</p>}
          <ProjectScrollArea className="project-description-scroll" label="project description">
            <p className="project-modal-description">{project.overview || project.description}</p>
          </ProjectScrollArea>
          <div className="project-modal-detail-grid">
            {features.length > 0 && <div className="project-modal-features">
              <h3><span><Check size={15} /></span> Key Features</h3>
              <ProjectScrollArea className="project-features-scroll" label="key features">
                <ul>{features.map((feature, index) => <li key={`${feature}-${index}`}><Check size={15} />{feature}</li>)}</ul>
              </ProjectScrollArea>
            </div>}
            <div className="project-modal-tech">
              <h3><span className="project-modal-tech-icon"><Layers size={15} /></span> Tech Stack</h3>
              <ProjectScrollArea className="project-tech-scroll" label="technology stack">
                <div className="project-modal-tags">{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              </ProjectScrollArea>
            </div>
          </div>
          <div className="project-modal-actions">
            {hasLiveDemo && <a className="button button-primary" href={project.liveDemoUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Live Demo <ArrowUpRight size={14} /></a>}
            {hasSource && <a className="button button-quiet" href={project.sourceCodeUrl} target="_blank" rel="noreferrer"><Github size={16} /> Source Code <ArrowUpRight size={14} /></a>}
          </div>
          <div className="project-modal-meta">
            {project.date && <span><CalendarDays size={14} />{project.date}</span>}
            {project.role && <span><UserRound size={14} />{project.role}</span>}
            <span><Layers size={14} />{project.projectType}</span>
          </div>
        </div>
      </section>
      {expandedImage && gallery[activeImage] && <div className="project-image-lightbox" role="dialog" aria-modal="true" aria-label="Project image" onClick={() => setExpandedImage(false)}>
        <button type="button" className="project-image-lightbox-close" onClick={() => setExpandedImage(false)} aria-label="Close image"><X size={22} /></button>
        <img src={gallery[activeImage]} alt={`${project.title} full-size screenshot ${activeImage + 1}`} onClick={(event) => event.stopPropagation()} />
      </div>}
    </div>
  )
}

function EmailContactModal({ email, onClose }: { email: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      const field = document.createElement('textarea')
      field.value = email
      field.style.position = 'fixed'
      field.style.opacity = '0'
      document.body.appendChild(field)
      field.select()
      const success = document.execCommand('copy')
      field.remove()
      setCopied(success)
    }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="email-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="email-modal" role="dialog" aria-modal="true" aria-labelledby="email-modal-title">
        <button className="email-modal-close" type="button" onClick={onClose} aria-label="Close email options"><X size={18} /></button>
        <span className="email-modal-icon"><Mail size={21} /></span>
        <p className="email-modal-eyebrow">GET IN TOUCH</p>
        <h2 id="email-modal-title">Let's talk.</h2>
        <p className="email-modal-copy">Reach me directly by email. Choose how you'd like to continue.</p>
        <div className="email-address">{email}</div>
        <div className="email-modal-actions">
          <button className="button button-primary" type="button" onClick={copyEmail}><Mail size={15} /> {copied ? 'Copied!' : 'Copy email'}</button>
          <a className="button button-quiet" href={gmailUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Open Gmail</a>
          <a className="button button-quiet" href={`mailto:${email}`}><ArrowUpRight size={15} /> Open email app</a>
        </div>
        <p className="email-modal-note">I usually reply as soon as I can.</p>
      </section>
    </div>
  )
}

function PortfolioHome() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')
  const [selectedProject, setSelectedProject] = useState<(typeof projects)[number] | null>(null)
  const [emailOpen, setEmailOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    if (!menuOpen && !ownerMenuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        setMenuOpen(false)
        setOwnerMenuOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); setOwnerMenuOpen(false) }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen, ownerMenuOpen])
  const workRef = useWorkScrollReveal()
  const stackRef = useToolkitScrollReveal()

  return (
    <main id="main-content">
      <MobileExperienceNotice />
      <a className="skip-link" href="#work">Skip to content</a>
      <header className="site-header" ref={headerRef}>
        <div className="wordmark-menu-wrap"><button className="wordmark" type="button" aria-label="Open home and admin menu" aria-haspopup="true" aria-expanded={ownerMenuOpen} onClick={() => setOwnerMenuOpen(value => !value)}>J<span>.</span></button>{ownerMenuOpen && <div className="wordmark-dropdown" role="menu"><a href="#home" role="menuitem" onClick={() => { setOwnerMenuOpen(false); setMenuOpen(false); setActiveSection('home') }}>Home</a><a href="/admin/" role="menuitem">Admin login <ArrowUpRight size={13} /></a></div>}</div>
        <nav id="primary-navigation" className={`desktop-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          {navItems.map((item) => (
            <a key={item} className={activeSection === item.toLowerCase() ? 'active' : ''} href={`#${item.toLowerCase()}`} onClick={() => { setActiveSection(item.toLowerCase()); closeMenu() }}>{item}</a>
          ))}
        </nav>
        <div className="header-actions">
          <a className="resume-link" href="#contact">Let's connect <ArrowUpRight size={14} /></a>
          <button
            className="icon-button menu-toggle"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
          >
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </header>

      <section className="hero section-shell" id="home">
        <div className="hero-copy">
          <p className="eyebrow hero-greeting">{siteContent.greeting}</p>
          <h1 className="hero-name">{siteContent.name}<span>.</span></h1>
          <p className="hero-role">{siteContent.role}</p>
          <p className="hero-description">{siteContent.description}</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#work">Explore my work <ArrowUpRight size={16} /></a>
            <a className="button button-quiet" href="#contact">Get in touch</a>
          </div>
          <div className="social-links" aria-label="Social links">
            <a href={siteContent.github} target="_blank" rel="noreferrer" aria-label="GitHub"><Github size={17} /></a>
            <a href={siteContent.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn"><Linkedin size={17} /></a>
            <button type="button" className="social-email-button" onClick={() => setEmailOpen(true)} aria-label="Show email contact options"><Mail size={17} /></button>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true"><MountainExperience /></div>
        <img
          src="/assets/Mountain1.webp"
          className="mountain4-foreground-overlay"
          alt=""
          aria-hidden="true"
          decoding="async"
          draggable="false"
        />
        <a className="scroll-cue" href="#work"><span>SCROLL TO EXPLORE</span><span className="scroll-line" /></a>
      </section>

      <section className="work-section section-shell section-spacing" id="work" ref={workRef}>
        <div className="section-heading">
          <div><SectionLabel number="01" label="SELECTED WORK" /><h2>Projects with<br /><em>purpose.</em></h2></div>
          <p>A selection of experiments and applications shaped by curiosity, problem-solving and a love for building useful things.</p>
        </div>
        <div className="work-filters" role="navigation" aria-label="Project categories">
          <a className="work-filter is-selected" href="#work"><span className="filter-star">☆</span> Featured</a>
          <a className="work-filter" href="/project-lab?cat=Web%20Apps"><span className="filter-icon">◎</span> Web Apps</a>
          <a className="work-filter" href="/project-lab?cat=AI%20%2F%20ML"><span className="filter-icon">▦</span> AI / ML</a>
          <a className="work-filter" href="/project-lab?cat=Desktop%20Apps"><span className="filter-icon">▣</span> Desktop Apps <small>{projects.filter((project) => project.projectType === "Desktop Apps").length}</small></a>
          <a className="work-filter" href="/project-lab?cat=Databases"><span className="filter-icon">▤</span> Databases <small>{projects.filter((project) => project.projectType === "Databases").length}</small></a>
          <a className="work-filter work-filter-lab" href="/project-lab">View Project Lab <span>↗</span></a>
        </div>
        <div className="project-grid">
          {(projects.filter((project) => project.featured).length ? projects.filter((project) => project.featured) : projects).slice(0, 3).map((project, index) => (
            <article className={`project-card project-${(index % 5) + 1}`} key={project.slug} role="button" tabIndex={0} onClick={() => setSelectedProject(project)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedProject(project) } }} aria-label={`View details for ${project.title}`}>
              <div className={`project-art art-${(index % 5) + 1}`}>
                <div className="art-shape" />
              </div>
              <div className="project-info">
                <div><p className="project-category">{project.category}</p><h3>{project.title}</h3><p>{project.description}</p></div>
                <span className="round-link" aria-hidden="true"><ArrowUpRight size={19} /></span>
              </div>
              <div className="tag-list">{project.tags.slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}{project.tags.length > 5 && <button className="tag-more" type="button" onClick={(event) => { event.stopPropagation(); setSelectedProject(project) }}>More</button>}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="about-section section-shell section-spacing" id="about">
        <div className="about-visual about-photo-frame">
          <img
            className="about-portrait-tile"
            src={aboutContent.portrait}
            width={1088}
            height={1445}
            loading="lazy"
            decoding="async"
            alt="Joel in a black-and-white portrait framed by cyan and violet glass panels"
            draggable="false"
          />
        </div>
        <div className="about-copy">
          <SectionLabel number="02" label="A LITTLE ABOUT ME" />
          <h2>{aboutContent.headingLineOne}<br /><em>{aboutContent.headingLineTwo}</em></h2>
          <p>{aboutContent.paragraphOne}</p>
          <p>{aboutContent.paragraphTwo}</p>
          <a className="text-link" href="#contact">A little more about me <ArrowUpRight size={16} /></a>
        </div>
      </section>

      <section className="stack-section section-shell section-spacing" id="stack" ref={stackRef}>
        <div className="section-heading compact-heading">
          <div><SectionLabel number="03" label="TOOLS OF THE TRADE" /><h2>My <em>Toolkit.</em></h2></div>
          <p>A growing set of technologies I use to design, develop and bring ideas into the world.</p>
        </div>
        <div className="tech-grid">
          {technologies.map((technology, index) => (
            <article className={`tech-item tech-item-${(index % 4) + 1}`} key={technology.name}>
              <span className="tech-symbol" aria-hidden="true">{technology.symbol}</span>
              <span className="tech-copy"><strong>{technology.name}</strong><small>{technology.detail}</small></span>
            </article>
          ))}
        </div>
      </section>

      <section className="contact-section section-shell section-spacing" id="contact">
        <div className="contact-panel">
          <div><SectionLabel number="04" label="HAVE SOMETHING IN MIND?" /><h2>{contactContent.headingLineOne}<br /><em>{contactContent.headingLineTwo}</em></h2></div>
          <div className="contact-aside"><p>{contactContent.description}</p><a className="button button-primary" href={contactContent.whatsapp} target="_blank" rel="noreferrer">Start a conversation <ArrowUpRight size={16} /></a></div>
          <div className="contact-footer"><span>JOEL · SOFTWARE DEVELOPER</span><span>{contactContent.location}</span><a href="#home">BACK TO TOP ↑</a></div>
        </div>
      </section>

      <footer className="site-footer section-shell"><span>© {new Date().getFullYear()} Joel. Built with curiosity.</span><span>DESIGNED TO FEEL DIFFERENT.</span></footer>
      {emailOpen && <EmailContactModal email={contactContent.email} onClose={() => setEmailOpen(false)} />}
      {selectedProject && <ProjectDetailModal project={selectedProject} onClose={() => setSelectedProject(null)} />}
    </main>
  )
}

const labCategories = ['All Projects', 'Web Apps', 'AI / ML', 'Desktop Apps', 'Databases', 'Others'] as const

function ProjectLabPage() {
  const [query, setQuery] = useState('')
  const initialCategory = new URLSearchParams(window.location.search).get('cat')
  const [category, setCategory] = useState<(typeof labCategories)[number]>(
    labCategories.includes(initialCategory as (typeof labCategories)[number]) ? initialCategory as (typeof labCategories)[number] : 'All Projects'
  )
  const [sort, setSort] = useState('Newest')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [selectedProject, setSelectedProject] = useState<(typeof projects)[number] | null>(null)

  const categorizedProjects = projects.map((project, index) => ({
    ...project,
    number: String(index + 1).padStart(2, '0'),
    type: project.projectType,
  }))

  const filtered = categorizedProjects
    .filter((project) => category === 'All Projects' || project.type === category)
    .filter((project) => `${project.title} ${project.description} ${project.tags.join(' ')} ${project.category}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sort === 'A–Z' ? a.title.localeCompare(b.title) : sort === 'Z–A' ? b.title.localeCompare(a.title) : categorizedProjects.indexOf(a) - categorizedProjects.indexOf(b))

  const categoryIcons = [null, Globe, Cpu, Monitor, Database, MoreHorizontal]

  return (
    <main className="project-lab-page" id="main-content">
      <a className="skip-link" href="#lab-projects">Skip to content</a>
      <header className="lab-header">
        <a className="wordmark" href="/#home" aria-label="Joel home">J<span>.</span></a>
        <div className="lab-breadcrumb"><a href="/#work">WORK</a><span>/</span><strong>PROJECT LAB</strong></div>
        <a className="resume-link" href="/#contact">Let's connect <ArrowUpRight size={14} /></a>
      </header>

      <section className="lab-main">
        <div className="lab-hero">
          <div className="lab-hero-copy">
            <p className="lab-kicker">A CLOSER LOOK AT WHAT I BUILD</p>
            <h1>Project <em>Lab</em></h1>
            <p>A complete collection of my projects, experiments and applications.<br className="desktop-break" /> Browse, filter and explore based on your interest.</p>
          </div>
        </div>

        <div className="lab-tools">
          <label className="lab-search">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects..." aria-label="Search projects" />
            {query && <button onClick={() => setQuery('')} aria-label="Clear search">×</button>}
          </label>
          <div className="lab-tool-right">
            <label className="lab-sort">Sort: 
              <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort projects">
                <option>Newest</option><option>A–Z</option><option>Z–A</option>
              </select>
              <ChevronDown size={14} />
            </label>
            <div className="lab-view-toggle" aria-label="Project layout">
              <button className={view === 'grid' ? 'selected' : ''} onClick={() => setView('grid')} aria-label="Grid view"><LayoutGrid size={17} /></button>
              <button className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')} aria-label="List view"><List size={17} /></button>
            </div>
          </div>
        </div>

        <div className="lab-categories" role="tablist" aria-label="Filter projects">
          {labCategories.map((item, index) => {
            const Icon = categoryIcons[index]
            const count = item === 'All Projects' ? categorizedProjects.length : categorizedProjects.filter((project) => project.type === item).length
            return <button key={item} role="tab" aria-selected={category === item} className={`lab-category ${category === item ? 'active' : ''}`} onClick={() => setCategory(item)}>
              {Icon ? <Icon size={15} /> : <span className="lab-category-star">✦</span>}{item}<small>{count}</small>
            </button>
          })}
        </div>

        <div className={`lab-project-grid ${view === 'list' ? 'list-view' : ''}`}>
          {filtered.map((project, index) => (
            <article className={`lab-project-card project-${(index % 3) + 1}`} key={project.slug} role="button" tabIndex={0} onClick={() => setSelectedProject(project)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedProject(project) } }} aria-label={`View details for ${project.title}`}>
              <div className={`lab-project-art art-${(index % 5) + 1}`}>
                <div className="art-shape" />
                <span className="lab-card-open" aria-hidden="true"><ArrowUpRight size={17} /></span>
              </div>
              <div className="lab-project-info">
                <div><h2>{project.title}</h2><p>{project.description}</p></div>
                <div className="tag-list">{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              </div>
            </article>
          ))}
          {filtered.length === 0 && <div className="lab-empty"><Search size={24} /><h2>No projects found</h2><p>Try another search or choose a different category.</p><button onClick={() => { setQuery(''); setCategory('All Projects') }}>Clear filters</button></div>}
        </div>

        <div className="lab-footer">
          <span>SHOWING <b>{filtered.length}</b> OF <b>{categorizedProjects.length}</b> PROJECTS</span>
          <a href="/#work">← BACK TO PORTFOLIO</a>
        </div>
      </section>
      {selectedProject && <ProjectDetailModal project={selectedProject} onClose={() => setSelectedProject(null)} />}
    </main>
  )
}

export default function App() {
  const [path, setPath] = useState(() => window.location.pathname.replace(/\/+$/, '') || '/')
  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname.replace(/\/+$/, '') || '/')
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
  if (path === '/project-lab') return <ProjectLabPage />
  if (path === '/' || path === '') return <PortfolioHome />
  return <main className="not-found"><h1>Page not found.</h1><a href="/">Return home</a></main>
}
