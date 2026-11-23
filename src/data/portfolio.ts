import site from '../content/site.json'
import about from '../content/about.json'
import contact from '../content/contact.json'
import toolkit from '../content/toolkit.json'

export type Project = {
  title: string
  category: string
  description: string
  tags: string[]
  featured?: boolean
  sortOrder?: number
  image?: string
  images?: string[]
  overview?: string
  features?: string[]
  showLiveDemo?: boolean
  liveDemoUrl?: string
  sourceCodeUrl?: string
  date?: string
  role?: string
  slug: string
  projectType: 'Web Apps' | 'AI / ML' | 'Desktop Apps' | 'Databases' | 'Others'
}

const projectFiles = import.meta.glob('../content/projects/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, Omit<Project, 'slug'>>

export const projects: Project[] = Object.entries(projectFiles)
  .map(([filePath, project]) => ({
    ...project,
    // Use the CMS-generated JSON filename as a stable ID; no CMS slug field required.
    slug: filePath.split('/').pop()?.replace(/\.json$/, '') ?? project.title,
  }))
  .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))

export const technologies = toolkit.technologies
export const siteContent = site
export const aboutContent = about
export const contactContent = contact
