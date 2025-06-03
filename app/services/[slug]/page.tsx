import type { Metadata } from "next"
import ServicePageClient from "./ServicePageClient"
import { notFound } from "next/navigation"
import { services } from "@/lib/services-data"

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params: paramsPromise }: Props): Promise<Metadata> {
  const params = await paramsPromise
  const service = services.find((service) => service.slug === params.slug)

  if (!service) {
    return {
      title: "Service Not Found",
    }
  }

  return {
    title: `${service.title} | Summit Advisory`,
    description: service.description,
  }
}

export async function generateStaticParams() {
  return services.map((service) => ({
    slug: service.slug,
  }))
}

export default async function ServicePage({ params: paramsPromise }: Props) {
  const params = await paramsPromise
  const service = services.find((service) => service.slug === params.slug)

  if (!service) {
    notFound()
  }

  return <ServicePageClient params={params} />
}
