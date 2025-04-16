import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useState } from "react";

interface Transaction {
  id: number;
  transactionId: string;
  type: string;
  sourceAmount: string;
  sourceCurrency: string;
  targetAmount: string;
  targetCurrency: string;
  status: string;
  createdAt: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
  showPagination?: boolean;
  pageSize?: number;
}

export default function TransactionTable({
  transactions,
  showPagination = true,
  pageSize = 5,
}: TransactionTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  
  // Calculate pagination
  const totalPages = Math.ceil(transactions.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentTransactions = transactions.slice(startIndex, endIndex);
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };
  
  // Get transaction status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
            Tamamlandı
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
            Bekliyor
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            İşlemde
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">
            İptal Edildi
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            {status}
          </Badge>
        );
    }
  };
  
  // Get transaction type display text
  const getTypeDisplay = (type: string) => {
    switch (type) {
      case "conversion":
        return "Dönüşüm";
      case "withdrawal":
        return "Para Çekme";
      default:
        return type;
    }
  };
  
  // Get transaction amount display
  const getAmountDisplay = (transaction: Transaction) => {
    if (transaction.type === "conversion") {
      return `${parseFloat(transaction.sourceAmount).toLocaleString("tr-TR")} ${transaction.sourceCurrency} → ${parseFloat(transaction.targetAmount).toLocaleString("tr-TR")} ${transaction.targetCurrency}`;
    } else {
      return `${parseFloat(transaction.sourceAmount).toLocaleString("tr-TR")} ${transaction.sourceCurrency}`;
    }
  };

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>İşlem No</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Tür</TableHead>
              <TableHead>Miktar</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentTransactions.map((transaction) => (
              <TableRow key={transaction.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">{transaction.transactionId}</TableCell>
                <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                <TableCell>{getTypeDisplay(transaction.type)}</TableCell>
                <TableCell>{getAmountDisplay(transaction)}</TableCell>
                <TableCell>{getStatusBadge(transaction.status)}</TableCell>
              </TableRow>
            ))}
            
            {currentTransactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  İşlem bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {showPagination && totalPages > 1 && (
        <div className="mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => handlePageChange(page)}
                    isActive={page === currentPage}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
