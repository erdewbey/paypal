import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  linkText?: string;
  linkHref?: string;
}

export default function StatsCard({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  linkText,
  linkHref
}: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${iconBgColor} rounded-md p-3`}>
            <div className={iconColor}>{icon}</div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">
                  {value}
                </div>
              </dd>
            </dl>
          </div>
        </div>
        
        {linkText && linkHref && (
          <div className="bg-gray-50 px-5 py-3 -mx-5 mt-5 -mb-5 rounded-b-lg">
            <div className="text-sm">
              <Link href={linkHref}>
                <span className="font-medium text-primary-600 hover:text-primary-700 flex items-center cursor-pointer">
                  {linkText}
                  <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
