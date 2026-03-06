"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { PagePreloader } from "@/components/ui/preloader";
import { toast } from "sonner";

interface Property {
  _id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
  };
  type: string;
  units?: { _id: string }[];
}

interface Owner {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  isActive: boolean;
  createdAt: string;
  properties: Property[];
  propertyCount: number;
  avatar?: string;
}

export default function OwnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOwner = async () => {
      try {
        const response = await fetch(`/api/owners/${id}`);
        const data = await response.json();

        if (data.success) {
          setOwner(data.data);
        } else {
          toast.error("Owner not found");
          router.push("/dashboard/owners");
        }
      } catch (error) {
        console.error("Error fetching owner:", error);
        toast.error("Failed to fetch owner details");
      } finally {
        setLoading(false);
      }
    };

    fetchOwner();
  }, [id, router]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this owner?")) return;

    try {
      const response = await fetch(`/api/owners/${id}`, { method: "DELETE" });
      const data = await response.json();

      if (data.success) {
        toast.success("Owner deleted successfully");
        router.push("/dashboard/owners");
      } else {
        toast.error(data.error || "Failed to delete owner");
      }
    } catch (error) {
      console.error("Error deleting owner:", error);
      toast.error("Failed to delete owner");
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  if (loading) {
    return <PagePreloader />;
  }

  if (!owner) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/owners">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">
              {owner.firstName} {owner.lastName}
            </h1>
            <p className="text-muted-foreground">Property Owner Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/owners/${id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24">
                <AvatarImage src={owner.avatar} />
                <AvatarFallback className="text-2xl">
                  {getInitials(owner.firstName, owner.lastName)}
                </AvatarFallback>
              </Avatar>
              <h3 className="mt-4 text-lg font-semibold">
                {owner.firstName} {owner.lastName}
              </h3>
              <Badge variant={owner.isActive ? "default" : "secondary"}>
                {owner.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${owner.email}`}
                  className="text-primary hover:underline"
                >
                  {owner.email}
                </a>
              </div>
              {owner.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${owner.phone}`}
                    className="text-primary hover:underline"
                  >
                    {owner.phone}
                  </a>
                </div>
              )}
              {owner.address && (owner.address.street || owner.address.city) && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    {owner.address.street && <p>{owner.address.street}</p>}
                    {(owner.address.city || owner.address.state) && (
                      <p>
                        {owner.address.city}
                        {owner.address.city && owner.address.state && ", "}
                        {owner.address.state} {owner.address.zipCode}
                      </p>
                    )}
                    {owner.address.country && <p>{owner.address.country}</p>}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Joined {new Date(owner.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Properties</CardTitle>
              <CardDescription>
                {owner.propertyCount} propert
                {owner.propertyCount !== 1 ? "ies" : "y"} owned
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/properties?ownerId=${id}`}>
                View All
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {owner.properties.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">No properties</h3>
                <p className="text-muted-foreground">
                  This owner doesn&apos;t have any properties assigned yet.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/dashboard/properties/new">
                    Add Property
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Units</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {owner.properties.map((property) => (
                      <TableRow key={property._id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{property.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {property.address?.street}, {property.address?.city}
                              , {property.address?.state}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">
                          {property.type?.replace("_", " ")}
                        </TableCell>
                        <TableCell>{property.units?.length || 0}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/properties/${property._id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
